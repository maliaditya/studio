

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, Magnet, Package, MessageCircle, ArrowRight, Book, Target, Calendar as CalendarIcon, Banknote, Clock, PlusCircle, Briefcase, DraftingCompass, Copy, Download, Edit, Trash2, Github, Globe, Link as LinkIcon, Search, Sparkles, Loader2, X, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format, parseISO, isAfter, differenceInDays, startOfDay } from 'date-fns';
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
import type { SkillAcquisitionPlan, HabitEquation, Project, ProjectPlan, GapAnalysis, Release, Offer, ExerciseCategory, ExerciseDefinition, MicroSkill, CoreSkill, SkillArea, LearningPlan, LearningResourceAudio, LearningResourceBook, SkillTreePathPlan, KanbanCard, ProjectTechnicalSection } from '@/types/workout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { offerTypes, GAP_TYPES, productTypes } from '@/lib/constants';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DialogTitle as DialogTitleComponent, DialogDescription as DialogDescriptionComponent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { getAiConfigFromSettings } from '@/lib/ai/config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type OfferFieldKey = 'name' | 'outcome' | 'audience' | 'deliverables' | 'valueStack' | 'timeline' | 'price' | 'format';
type OfferDraft = Partial<Offer> & { offerTypeLabel?: string; generatedByAi?: boolean };
type EditingOffersState = { specializationId: string; offers: OfferDraft[]; selectedOfferId: string | null };
type ProjectDraft = Partial<Release>;
type EditingProjectsState = { specializationId: string; releases: ProjectDraft[]; selectedReleaseId: string | null };
type SpecializationModalState = { specializationId: string; mode: 'offer-types' | 'gap-analysis' } | null;
const PROJECT_TECHNICAL_SECTION_TITLES: ProjectTechnicalSection['title'][] = [
  'Problem / Goal',
  'System Architecture',
  'Core Implementation',
  'Technologies Used',
  'Optimization / Challenges',
  'Result / Output',
];

const createEmptyProjectTechnicalDetails = (): ProjectTechnicalSection[] =>
  PROJECT_TECHNICAL_SECTION_TITLES.map((title) => ({
    title,
    content: [],
  }));

const normalizeProjectTechnicalDetails = (sections?: ProjectTechnicalSection[] | null): ProjectTechnicalSection[] =>
  PROJECT_TECHNICAL_SECTION_TITLES.map((title) => {
    const match = (sections || []).find((section) => section.title === title);
    return {
      title,
      content: Array.isArray(match?.content)
        ? match.content.filter((item): item is string => typeof item === 'string' && item.trim()).map((item) => item.trim())
        : [],
    };
  });

const normalizeTechnicalDetailLineForComparison = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const createEmptyOfferDraft = (): OfferDraft => ({
  id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  outcome: '',
  audience: '',
  deliverables: '',
  valueStack: '',
  timeline: '',
  price: '',
  format: '',
});

const createEmptyProjectDraft = (): ProjectDraft => ({
  id: `release_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  description: '',
  launchDate: format(new Date(), 'yyyy-MM-dd'),
  focusAreaIds: [],
  addToPortfolio: true,
});

const normalizeProjectName = (value?: string | null) => String(value || '').trim().toLowerCase();

const reconcileProjectsForDrafts = ({
  existingProjects,
  releases,
  priorReleases,
  domainId,
}: {
  existingProjects: Project[];
  releases: Release[];
  priorReleases: Release[];
  domainId: string;
}) => {
  const nextProjects = [...existingProjects];
  const projectIdByReleaseId = new Map<string, string>();

  releases.forEach((release) => {
    const releaseId = String(release.id || '').trim();
    const nextName = String(release.name || '').trim();
    if (!releaseId || !nextName) return;

    const priorName = String(priorReleases.find((item) => item.id === releaseId)?.name || '').trim();
    const nextIndex = nextProjects.findIndex(
      (project) => project.domainId === domainId && normalizeProjectName(project.name) === normalizeProjectName(nextName)
    );
    const priorIndex = priorName
      ? nextProjects.findIndex(
          (project) => project.domainId === domainId && normalizeProjectName(project.name) === normalizeProjectName(priorName)
        )
      : -1;

    if (priorIndex >= 0) {
      if (nextIndex >= 0 && nextIndex !== priorIndex) {
        projectIdByReleaseId.set(releaseId, nextProjects[nextIndex].id);
        return;
      }

      const priorProject = nextProjects[priorIndex];
      nextProjects[priorIndex] = {
        ...priorProject,
        name: nextName,
      };
      projectIdByReleaseId.set(releaseId, priorProject.id);
      return;
    }

    if (nextIndex >= 0) {
      projectIdByReleaseId.set(releaseId, nextProjects[nextIndex].id);
      return;
    }

    const newProjectId = `proj_${releaseId}`;
    nextProjects.push({
      id: newProjectId,
      name: nextName,
      domainId,
      features: [],
    });
    projectIdByReleaseId.set(releaseId, newProjectId);
  });

  return { nextProjects, projectIdByReleaseId };
};

function OfferPreviewMarkdown({ content, fallback }: { content?: string; fallback: string }) {
  if (!(content || '').trim()) {
    return <p>{fallback}</p>;
  }

  return (
    <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-p:my-0 prose-p:leading-7 prose-strong:text-foreground prose-ul:my-0 prose-ul:pl-5 prose-li:my-1 prose-li:leading-7 prose-ol:my-0 prose-ol:pl-5 dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}


function PlanningContent() {
  const { 
    leadGenDefinitions, 
    offerizationPlans,
    skillAcquisitionPlans, 
    setSkillAcquisitionPlans,
    projects,
    setProjects,
    coreSkills,
    skillDomains,
    mindsetCards,
    deepWorkDefinitions,
    upskillDefinitions,
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
  const [isRuleEquationPickerOpen, setIsRuleEquationPickerOpen] = useState(false);
  const [isComponentProjectPickerOpen, setIsComponentProjectPickerOpen] = useState(false);

  const specializations = React.useMemo(() => {
    return coreSkills.filter(skill => skill.type === 'Specialization');
  }, [coreSkills]);

  const botheringLinkedSpecializationIds = useMemo(() => {
    const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const microSkillToSpecIds = new Map<string, Set<string>>();

    specializations.forEach((spec) => {
      spec.skillAreas.forEach((area) => {
        area.microSkills.forEach((microSkill) => {
          const key = normalizeText(microSkill.name);
          if (!key) return;
          if (!microSkillToSpecIds.has(key)) {
            microSkillToSpecIds.set(key, new Set<string>());
          }
          microSkillToSpecIds.get(key)!.add(spec.id);
        });
      });
    });

    const linkedTaskIds = new Set<string>();
    const linkedTaskNames = new Set<string>();

    (mindsetCards || [])
      .filter((card) => card.id.startsWith('mindset_botherings_'))
      .forEach((card) => {
        (card.points || []).forEach((point) => {
          (point.tasks || []).forEach((task) => {
            if (task.type !== 'deepwork' && task.type !== 'upskill') return;
            if (task.activityId) linkedTaskIds.add(task.activityId);
            if (task.id) linkedTaskIds.add(task.id);
            const normalizedDetails = normalizeText(task.details);
            if (normalizedDetails) linkedTaskNames.add(normalizedDetails);
          });
        });
      });

    const matchedSpecializationIds = new Set<string>();
    specializations.forEach((spec) => {
      if (linkedTaskNames.has(normalizeText(spec.name))) {
        matchedSpecializationIds.add(spec.id);
      }
    });

    [...(deepWorkDefinitions || []), ...(upskillDefinitions || [])].forEach((definition) => {
      const isMatchedById = linkedTaskIds.has(definition.id);
      const isMatchedByName = linkedTaskNames.has(normalizeText(definition.name));
      if (!isMatchedById && !isMatchedByName) return;

      const specIds = microSkillToSpecIds.get(normalizeText(definition.category));
      specIds?.forEach((specId) => matchedSpecializationIds.add(specId));
    });

    return matchedSpecializationIds;
  }, [specializations, mindsetCards, deepWorkDefinitions, upskillDefinitions]);

  const linkedSpecializations = useMemo(() => {
    return specializations.filter((spec) => botheringLinkedSpecializationIds.has(spec.id));
  }, [specializations, botheringLinkedSpecializationIds]);

  const normalizeDateValue = useCallback((value?: string | null) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return format(parsed, 'yyyy-MM-dd');
  }, []);

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
      setCurrentSkillPlan({
        ...plan,
        targetDate: normalizeDateValue(plan.targetDate),
      });
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

  const handleSelectSpecializationForPlan = useCallback((specId: string) => {
    setSelectedSpecId(specId);
    const existingPlan = skillAcquisitionPlans.find(p => p.specializationId === specId);
    if (existingPlan) {
      setCurrentSkillPlan({
        ...existingPlan,
        targetDate: normalizeDateValue(existingPlan.targetDate),
      });
      return;
    }
    setCurrentSkillPlan({
      linkedRuleEquationIds: [],
      targetDate: '',
      requiredMoney: null,
      requiredHours: null,
    });
  }, [normalizeDateValue, skillAcquisitionPlans]);

  const handleDeleteSkillPlan = (specializationId: string) => {
    setSkillAcquisitionPlans(prev => prev.filter(p => p.specializationId !== specializationId));
    toast({
      title: 'Plan Deleted',
      description: 'The skill acquisition plan has been removed.',
      variant: 'destructive',
    });
  };
  
  const handleOpenProductPlanModal = (project: Project) => {
    setSelectedProjectId(project.id);
    setIsRuleEquationPickerOpen(false);
    setIsComponentProjectPickerOpen(false);
    if (project.productPlan) {
      setCurrentProductPlan({
        ...project.productPlan,
        targetDate: normalizeDateValue(project.productPlan.targetDate),
        componentProjectIds: project.productPlan.componentProjectIds || [],
      });
    } else {
      setCurrentProductPlan({ linkedRuleEquationIds: [], componentProjectIds: [] });
    }
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

  const handleProductComponentProjectToggle = (projectId: string) => {
    setCurrentProductPlan(prev => {
      const currentIds = prev.componentProjectIds || [];
      const nextIds = currentIds.includes(projectId)
        ? currentIds.filter(id => id !== projectId)
        : [...currentIds, projectId];
      return { ...prev, componentProjectIds: nextIds };
    });
  };

  const handleSaveProductPlan = () => {
    if (!selectedProjectId) return;
    setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, productPlan: currentProductPlan as ProjectPlan } : p));
    setIsRuleEquationPickerOpen(false);
    setIsComponentProjectPickerOpen(false);
    setIsProductPlanModalOpen(false);
  };

  const selectedProductPlanProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectableComponentProjects = useMemo(() => {
    if (!selectedProductPlanProject) return [] as Project[];
    return projects.filter(project => project.id !== selectedProductPlanProject.id);
  }, [projects, selectedProductPlanProject]);

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
                    <CardDescription>Create and manage specialization plans in a simplified flow.</CardDescription>
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
                                  <p className="text-xs text-muted-foreground">
                                      Specialization plan configured. Click to edit.
                                  </p>
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
                      const componentProjects = (plan.componentProjectIds || [])
                        .map(id => projects.find(p => p.id === id))
                        .filter((p): p is Project => !!p);

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
                                  <Separator />
                                  <div>
                                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4"/> Components</h4>
                                      {componentProjects.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                              {componentProjects.map(component => (
                                                  <Badge key={component.id} variant="secondary">{component.name}</Badge>
                                              ))}
                                          </div>
                                      ) : (
                                          <p className="text-xs text-muted-foreground">No component projects linked.</p>
                                      )}
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
          <DialogHeader><DialogTitleComponent>Skill Acquisition Plan</DialogTitleComponent><DialogDescriptionComponent>Select a specialization and save the plan.</DialogDescriptionComponent></DialogHeader>
          <div className="flex-grow min-h-0 py-4">
              <ScrollArea className="h-full pr-4">
                  <div className="space-y-6">
                      <div>
                          <Label>Select Specialization to Plan</Label>
                          <Select value={selectedSpecId || ''} onValueChange={handleSelectSpecializationForPlan}>
                              <SelectTrigger><SelectValue placeholder="Choose a specialization..." /></SelectTrigger>
                              <SelectContent>
                                  {linkedSpecializations.map(spec => (
                                      <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          {linkedSpecializations.length === 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              No bothering-linked specializations found yet.
                            </p>
                          )}
                      </div>

                      {selectedSpecId && (
                          <div className="pt-4 border-t">
                              <p className="text-xs text-muted-foreground">
                                  Plan is ready for this specialization. Click Save Plan to continue.
                              </p>
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
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => setIsRuleEquationPickerOpen((prev) => !prev)}
                          >
                            {isRuleEquationPickerOpen ? 'Hide Rule Equations' : 'Link Rule Equations...'}
                          </Button>
                          {isRuleEquationPickerOpen && (
                            <div className="rounded-md border border-border/60 bg-background/40 p-2">
                              <ScrollArea className="h-60">
                                <div className="space-y-2 p-1">
                                  {Object.values(pillarEquations).flat().map(eq => (
                                    <div key={eq.id} className="flex items-center space-x-2 p-1">
                                      <Checkbox
                                        id={`prod-eq-${eq.id}`}
                                        checked={(currentProductPlan.linkedRuleEquationIds || []).includes(eq.id)}
                                        onCheckedChange={() => handleProductRuleLinkToggle(eq.id)}
                                      />
                                      <Label htmlFor={`prod-eq-${eq.id}`} className="font-normal w-full cursor-pointer">
                                        {eq.outcome}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                      </div>
                      <div className="space-y-4">
                          <h3 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5"/> Required Resources</h3>
                          <div className="space-y-1">
                              <Label className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarIcon className="h-4 w-4"/> Target Date</Label>
                              <Input
                                type="date"
                                value={currentProductPlan.targetDate || ''}
                                onChange={(e) => handleProductPlanFieldChange('targetDate', e.target.value)}
                              />
                          </div>
                          <div className="space-y-1">
                              <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Banknote className="h-4 w-4"/> Money (Total Amount)</Label>
                              <Input type="number" value={currentProductPlan.requiredMoney || ''} onChange={(e) => handleProductPlanFieldChange('requiredMoney', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 500" />
                          </div>
                          <div className="space-y-1">
                              <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-4 w-4"/> Energy (Total Productive Hours)</Label>
                              <Input type="number" value={currentProductPlan.requiredHours || ''} onChange={(e) => handleProductPlanFieldChange('requiredHours', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 200" />
                          </div>
                          <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Briefcase className="h-4 w-4"/> Component Projects</Label>
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => setIsComponentProjectPickerOpen((prev) => !prev)}
                              >
                                {(currentProductPlan.componentProjectIds || []).length > 0
                                  ? `${(currentProductPlan.componentProjectIds || []).length} component project(s)`
                                  : isComponentProjectPickerOpen
                                    ? 'Hide component projects'
                                    : 'Select component projects...'}
                              </Button>
                              {isComponentProjectPickerOpen && (
                                <div className="rounded-md border border-border/60 bg-background/40 p-2">
                                  <ScrollArea className="h-56">
                                    <div className="space-y-2 p-1">
                                      {selectableComponentProjects.length > 0 ? selectableComponentProjects.map(project => (
                                        <div key={project.id} className="flex items-center space-x-2 p-1">
                                          <Checkbox
                                            id={`prod-component-${project.id}`}
                                            checked={(currentProductPlan.componentProjectIds || []).includes(project.id)}
                                            onCheckedChange={() => handleProductComponentProjectToggle(project.id)}
                                          />
                                          <Label htmlFor={`prod-component-${project.id}`} className="font-normal w-full cursor-pointer">
                                            <div className="flex flex-col">
                                              <span>{project.name}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {skillDomains.find(domain => domain.id === project.domainId)?.name || 'Unknown domain'}
                                              </span>
                                            </div>
                                          </Label>
                                        </div>
                                      )) : (
                                        <p className="p-2 text-sm text-muted-foreground">No other projects available.</p>
                                      )}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}
                              {(currentProductPlan.componentProjectIds || []).length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                          {(currentProductPlan.componentProjectIds || []).map(componentId => {
                                              const componentProject = projects.find(project => project.id === componentId);
                                              return componentProject ? (
                                                  <Badge key={componentId} variant="secondary">
                                                      {componentProject.name}
                                                  </Badge>
                                              ) : null;
                                          })}
                                      </div>
                              )}
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
    const { projects, productizationPlans, pillarEquations } = useAuth();

    const projectPlanCards = useMemo(() => {
      return projects
        .map((project) => {
          const plan = project.productPlan;
          const legacyPlan = productizationPlans?.[project.name];
          if (!plan && !legacyPlan) return null;

          const linkedEquations = (plan?.linkedRuleEquationIds || []).map((id) => {
            for (const pillar in pillarEquations) {
              const found = pillarEquations[pillar].find((eq) => eq.id === id);
              if (found) return found;
            }
            return null;
          }).filter((eq): eq is HabitEquation => !!eq);
          const componentProjects = (plan?.componentProjectIds || [])
            .map((id) => projects.find((project) => project.id === id))
            .filter((project): project is Project => !!project);

          return {
            project,
            plan,
            legacyPlan,
            linkedEquations,
            componentProjects,
          };
        })
        .filter((item): item is {
          project: Project;
          plan?: ProjectPlan;
          legacyPlan?: Record<string, any>;
          linkedEquations: HabitEquation[];
          componentProjects: Project[];
        } => !!item);
    }, [projects, productizationPlans, pillarEquations]);

    return (
      <div className="space-y-6">
        <Card className="border-primary/20 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Package className="h-6 w-6 text-primary" />
              Productization
            </CardTitle>
            <CardDescription>
              Product plans created in Strategy appear here as execution-ready productization context.
            </CardDescription>
          </CardHeader>
        </Card>

        {projectPlanCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {projectPlanCards.map(({ project, plan, legacyPlan, linkedEquations, componentProjects }) => (
              <Card key={project.id} className="rounded-2xl border-border/60 bg-card/75">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>
                        {plan ? 'Product plan from Strategy' : 'Legacy productization plan'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {legacyPlan?.productType ? (
                        <Badge variant="secondary">{legacyPlan.productType}</Badge>
                      ) : null}
                      {plan ? <Badge variant="outline">Plan linked</Badge> : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Target className="h-4 w-4" />
                      Required State
                    </h4>
                    {linkedEquations.length > 0 ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {linkedEquations.map((eq) => (
                          <li key={eq.id}>• {eq.outcome}</li>
                        ))}
                      </ul>
                    ) : legacyPlan?.gapAnalysis?.outcomeGoal ? (
                      <p className="text-sm text-muted-foreground">{legacyPlan.gapAnalysis.outcomeGoal}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No state linked yet.</p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Package className="h-4 w-4" />
                      Required Resources
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          Target Date
                        </span>
                        <span className="font-medium">
                          {plan?.targetDate ? format(parseISO(plan.targetDate), 'PPP') : 'Not set'}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Banknote className="h-4 w-4" />
                          Money Needed
                        </span>
                        <span className="font-medium">
                          {plan?.requiredMoney != null ? `$${plan.requiredMoney}` : 'Not set'}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Hours Needed
                        </span>
                        <span className="font-medium">
                          {plan?.requiredHours != null ? `${plan.requiredHours} hrs` : 'Not set'}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Briefcase className="h-4 w-4" />
                      Components
                    </h4>
                    {componentProjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {componentProjects.map((component) => (
                          <Badge key={component.id} variant="secondary">{component.name}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No component projects linked.</p>
                    )}
                  </div>

                  {legacyPlan?.releases?.length > 0 ? (
                    <>
                      <Separator />
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <CalendarIcon className="h-4 w-4" />
                          Releases
                        </h4>
                        <div className="space-y-2">
                          {legacyPlan.releases.slice(0, 3).map((release: Release) => (
                            <div key={release.id} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm">
                              <div className="font-medium">{release.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Launch: {release.launchDate ? format(parseISO(release.launchDate), 'PPP') : 'Not set'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No productization items found. Add a product plan in `Planning to Product Plans` and it will appear here.
            </CardContent>
          </Card>
        )}
      </div>
    );
}

// OfferizationContent component and others remain unchanged
// ... Rest of the file
function OfferizationContent() {
  const { coreSkills, offerizationPlans, setOfferizationPlans, copyOffer, skillAcquisitionPlans, projects, setProjects, setKanbanBoards, microSkillMap, resources, openPdfViewer, settings, upskillDefinitions } = useAuth();
  const { toast } = useToast();
  const isDesktopRuntime = typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
  const aiConfig = useMemo(() => getAiConfigFromSettings(settings, isDesktopRuntime), [settings, isDesktopRuntime]);
  
  const [editingProject, setEditingProject] = useState<EditingProjectsState | null>(null);
  const [editingLearningPlanSpecId, setEditingLearningPlanSpecId] = useState<string | null>(null);
  const [specializationModal, setSpecializationModal] = useState<SpecializationModalState>(null);

  const [editingOffer, setEditingOffer] = useState<EditingOffersState | null>(null);
  const [pdfLinkPicker, setPdfLinkPicker] = useState<{
    isOpen: boolean;
    specializationId: string | null;
    target: 'book' | 'path' | null;
    index: number | null;
    pathId: string | null;
  }>({
    isOpen: false,
    specializationId: null,
    target: null,
    index: null,
    pathId: null,
  });
  const [pdfSearchTerm, setPdfSearchTerm] = useState('');
  
  // New state for hierarchical selection in the modal
  const [offerAiLoadingField, setOfferAiLoadingField] = useState<OfferFieldKey | null>(null);
  const [isGeneratingOffersBatch, setIsGeneratingOffersBatch] = useState(false);

  const pdfResources = useMemo(
    () => (resources || []).filter((resource) => resource.type === 'pdf'),
    [resources]
  );
  const filteredPdfResources = useMemo(() => {
    const query = pdfSearchTerm.trim().toLowerCase();
    if (!query) return pdfResources;
    return pdfResources.filter((resource) => {
      const name = (resource.name || '').toLowerCase();
      const description = (resource.description || '').toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [pdfResources, pdfSearchTerm]);

  const buildOfferAiContext = useCallback((specializationId: string) => {
    const specialization = coreSkills.find((skill) => skill.id === specializationId && skill.type === 'Specialization');
    const plan = offerizationPlans[specializationId] || {};
    if (!specialization) return null;

    const microSkillNames = specialization.skillAreas.flatMap((area) => area.microSkills.map((microSkill) => microSkill.name));
    const microSkillNameSet = new Set(microSkillNames.map((name) => name.trim().toLowerCase()).filter(Boolean));
    const curiosities = upskillDefinitions
      .filter((definition) => microSkillNameSet.has((definition.category || '').trim().toLowerCase()))
      .map((definition) => definition.name)
      .filter(Boolean)
      .slice(0, 40);

    return {
      name: specialization.name,
      skillAreas: specialization.skillAreas.map((area) => ({
        name: area.name,
        microSkills: area.microSkills.map((microSkill) => microSkill.name),
      })),
      microSkills: microSkillNames,
      curiosities,
      selectedOfferTypes: plan.offerTypes || [],
      gapAnalysis: plan.gapAnalysis || null,
      releases: (plan.releases || []).map((release) => ({
        name: release.name,
        description: release.description,
        launchDate: release.launchDate,
      })),
      relatedProjects: projects
        .filter((project) => project.name === specialization.name || (project.features || []).some((feature) => microSkillNameSet.has((feature.name || '').trim().toLowerCase())))
        .map((project) => project.name)
        .slice(0, 20),
    };
  }, [coreSkills, offerizationPlans, projects, upskillDefinitions]);

  const activeDraftOffer = useMemo(() => {
    if (!editingOffer) return null;
    return (
      editingOffer.offers.find((offer) => offer.id === editingOffer.selectedOfferId) ||
      editingOffer.offers[0] ||
      null
    );
  }, [editingOffer]);

  const activeDraftProject = useMemo(() => {
    if (!editingProject) return null;
    return (
      editingProject.releases.find((release) => release.id === editingProject.selectedReleaseId) ||
      editingProject.releases[0] ||
      null
    );
  }, [editingProject]);

  const activeLearningSpec = useMemo(
    () => coreSkills.find((skill) => skill.id === editingLearningPlanSpecId && skill.type === 'Specialization') || null,
    [coreSkills, editingLearningPlanSpecId]
  );
  const activeLearningPlan = useMemo(
    () => (editingLearningPlanSpecId ? (offerizationPlans[editingLearningPlanSpecId]?.learningPlan || {}) : {}),
    [editingLearningPlanSpecId, offerizationPlans]
  );
  const activeSpecializationModalSpec = useMemo(
    () => (specializationModal ? coreSkills.find((skill) => skill.id === specializationModal.specializationId && skill.type === 'Specialization') || null : null),
    [coreSkills, specializationModal]
  );
  const activeSpecializationModalPlan = useMemo(
    () => (specializationModal ? (offerizationPlans[specializationModal.specializationId] || {}) : {}),
    [offerizationPlans, specializationModal]
  );

  const openPdfLinkPicker = useCallback((
    specializationId: string,
    target: 'book' | 'path',
    index?: number,
    pathId?: string
  ) => {
    setPdfSearchTerm('');
    setPdfLinkPicker({
      isOpen: true,
      specializationId,
      target,
      index: typeof index === 'number' ? index : null,
      pathId: pathId || null,
    });
  }, []);

  const closePdfLinkPicker = useCallback(() => {
    setPdfLinkPicker({
      isOpen: false,
      specializationId: null,
      target: null,
      index: null,
      pathId: null,
    });
    setPdfSearchTerm('');
  }, []);

  const handleSelectPdfResourceForLearningPlan = useCallback((resourceId: string) => {
    const { specializationId, target, index, pathId } = pdfLinkPicker;
    if (!specializationId || !target) return;

    if (target === 'book' && index != null) {
      handleLearningPlanFieldChange(specializationId, 'book', index, 'linkedPdfResourceId', resourceId);
    } else if (target === 'path' && pathId) {
      handleUpdateSkillTreePathPlan(specializationId, pathId, { linkedPdfResourceId: resourceId });
    }
    closePdfLinkPicker();
  }, [closePdfLinkPicker, pdfLinkPicker]);

  const handleUnlinkPdfResource = useCallback((specializationId: string, target: 'book' | 'path', index?: number, pathId?: string) => {
    if (target === 'book' && typeof index === 'number') {
      handleLearningPlanFieldChange(specializationId, 'book', index, 'linkedPdfResourceId', null);
      return;
    }
    if (target === 'path' && pathId) {
      handleUpdateSkillTreePathPlan(specializationId, pathId, { linkedPdfResourceId: null });
    }
  }, []);

  const defaultWorkflowStages = useCallback(() => ({
    botheringPointId: null as string | null,
    botheringText: '',
    stageLabels: {
      idea: 'Idea -> pick simplest solution',
      code: 'Code -> make it run',
      break: 'Break -> observe failure',
      fix: 'Fix -> improve system',
    },
    ideaItems: [] as string[],
    codeItems: [] as string[],
    breakItems: [] as string[],
    fixItems: [] as string[],
  }), []);

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

  const handleGapAnalysisChange = (specializationId: string, field: keyof Omit<GapAnalysis, 'gapTypes'>, value: string) => {
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
    const currentReleases = (offerizationPlans[specializationId]?.releases || []).map((item) => ({
      ...item,
      workflowStages: { ...defaultWorkflowStages(), ...(item.workflowStages || {}) },
    }));
    const releases = currentReleases.length > 0 ? currentReleases : [{ ...createEmptyProjectDraft(), workflowStages: defaultWorkflowStages() }];
    const selectedReleaseId = release?.id || releases[0]?.id || null;
    setEditingProject({
      specializationId,
      releases,
      selectedReleaseId,
    });
  };

  const handleUpdateEditingRelease = (field: keyof Release, value: any) => {
    setEditingProject(current => {
      if (!current) return null;
      const selectedReleaseId = current.selectedReleaseId || current.releases[0]?.id || null;
      const specialization = coreSkills.find((skill) => skill.id === current.specializationId);
      return {
        ...current,
        selectedReleaseId,
        releases: current.releases.map((release) => {
          if (release.id !== selectedReleaseId) return release;
          if (field === 'name') {
            const selectedProject = projects.find((project) => {
              if (specialization?.domainId && project.domainId !== specialization.domainId) return false;
              return normalizeProjectName(project.name) === normalizeProjectName(String(value || ''));
            });
            return {
              ...release,
              name: value,
              focusAreaIds: selectedProject
                ? selectedProject.features.flatMap((feature) => feature.linkedSkills.map((link) => link.microSkillId))
                : (release.focusAreaIds || []),
            };
          }
          return { ...release, [field]: value };
        }),
      };
    });
  };

  const handleSelectEditingProject = useCallback((releaseId: string) => {
    setEditingProject((current) => (current ? { ...current, selectedReleaseId: releaseId } : null));
  }, []);

  const handleAddBlankProjectDraft = useCallback(() => {
    setEditingProject((current) => {
      if (!current) return current;
      const blankProject = { ...createEmptyProjectDraft(), workflowStages: defaultWorkflowStages() };
      return {
        ...current,
        releases: [...current.releases, blankProject],
        selectedReleaseId: blankProject.id || null,
      };
    });
  }, [defaultWorkflowStages]);

  const handleDeleteSelectedProjectDraft = useCallback(() => {
    setEditingProject((current) => {
      if (!current) return current;
      const selectedReleaseId = current.selectedReleaseId || current.releases[0]?.id || null;
      const remainingReleases = current.releases.filter((release) => release.id !== selectedReleaseId);
      if (remainingReleases.length === 0) {
        const blankProject = { ...createEmptyProjectDraft(), workflowStages: defaultWorkflowStages() };
        return {
          ...current,
          releases: [blankProject],
          selectedReleaseId: blankProject.id || null,
        };
      }
      return {
        ...current,
        releases: remainingReleases,
        selectedReleaseId: remainingReleases[0]?.id || null,
      };
    });
  }, [defaultWorkflowStages]);

  const handleSaveProjects = () => {
    if (!editingProject) return;
    const { specializationId, releases } = editingProject;
    const priorReleases = offerizationPlans[specializationId]?.releases || [];
    const specialization = coreSkills.find((skill) => skill.id === specializationId);
    const normalizedReleases = releases
      .map((release) => ({
        ...release,
        name: String(release.name || '').trim(),
        description: String(release.description || '').trim(),
        launchDate: String(release.launchDate || '').trim(),
        githubLink: String(release.githubLink || '').trim(),
        demoLink: String(release.demoLink || '').trim(),
        focusAreaIds: Array.isArray(release.focusAreaIds) ? release.focusAreaIds : [],
        workflowStages: { ...defaultWorkflowStages(), ...(release.workflowStages || {}) },
      }))
      .filter((release) => release.name || release.description || release.focusAreaIds.length > 0 || release.githubLink || release.demoLink);

    if (normalizedReleases.length === 0) {
      toast({ title: "Error", description: "Add at least one project before saving.", variant: "destructive" });
      return;
    }
    if (normalizedReleases.some((release) => !release.name)) {
      toast({ title: "Error", description: "Each project must have a name.", variant: "destructive" });
      return;
    }

    const duplicateNameCount = normalizedReleases.reduce<Record<string, number>>((acc, release) => {
      const key = normalizeProjectName(release.name);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    if (Object.values(duplicateNameCount).some((count) => count > 1)) {
      toast({ title: "Error", description: "Project names must be unique within this specialization.", variant: "destructive" });
      return;
    }

    if (specialization?.domainId) {
      const { nextProjects, projectIdByReleaseId } = reconcileProjectsForDrafts({
        existingProjects: projects,
        releases: normalizedReleases as Release[],
        priorReleases,
        domainId: specialization.domainId,
      });

      setProjects(nextProjects);
      setKanbanBoards((prevBoards) => prevBoards.map((board) => {
        const matchingRelease = (normalizedReleases as Release[]).find((release) => release.id === board.releaseId);
        if (!matchingRelease) return board;

        const nextProjectId = projectIdByReleaseId.get(matchingRelease.id) || board.projectId || null;
        const nextName = matchingRelease.name;
        const nextDescription = matchingRelease.description || '';
        const nextCards = board.cards.map((card) => (
          card.linkedProjectId === nextProjectId ? card : { ...card, linkedProjectId: nextProjectId }
        ));

        if (
          board.name === nextName &&
          (board.description || '') === nextDescription &&
          (board.projectId || null) === nextProjectId &&
          nextCards.every((card, index) => card === board.cards[index])
        ) {
          return board;
        }

        return {
          ...board,
          name: nextName,
          description: nextDescription,
          projectId: nextProjectId,
          cards: nextCards,
          updatedAt: new Date().toISOString(),
        };
      }));
    }

    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[specializationId] || {};
        newPlans[specializationId] = {
          ...currentPlan,
          releases: normalizedReleases
            .map((release) => release as Release)
            .sort((a,b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime()),
        };
        return newPlans;
    });

    toast({ title: "Projects Saved", description: `${normalizedReleases.length} project${normalizedReleases.length === 1 ? '' : 's'} saved.`});
    setEditingProject(null);
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
    const currentOffers = (offerizationPlans[specializationId]?.offers || []).map((item) => ({ ...item }));
    const offers = currentOffers.length > 0 ? currentOffers : [createEmptyOfferDraft()];
    const selectedOfferId = offer?.id || offers[0]?.id || null;
    setEditingOffer({
      specializationId,
      offers,
      selectedOfferId,
    });
  };

  const handleUpdateEditingOffer = useCallback((field: keyof Offer, value: string) => {
    setEditingOffer(current => {
      if (!current) return null;
      const selectedOfferId = current.selectedOfferId || current.offers[0]?.id || null;
      return {
        ...current,
        selectedOfferId,
        offers: current.offers.map((offer) =>
          offer.id === selectedOfferId
            ? {
                ...offer,
                [field]: value,
              }
            : offer
        ),
      };
    });
  }, []);

  const openSpecializationModal = useCallback((
    specializationId: string,
    mode: 'offer-types' | 'gap-analysis',
    hasOfferTypes: boolean
  ) => {
    setSpecializationModal({
      specializationId,
      mode: mode === 'gap-analysis' && !hasOfferTypes ? 'offer-types' : mode,
    });
  }, []);

  const handleSummaryCardClick = useCallback((
    specializationId: string,
    target: 'offer-types' | 'gap-analysis' | 'learning' | 'projects' | 'offers',
    hasOfferTypes: boolean
  ) => {
    if (target === 'learning') {
      setEditingLearningPlanSpecId(specializationId);
      return;
    }
    if (target === 'projects') {
      handleStartEditingRelease(specializationId);
      return;
    }
    if (target === 'offers') {
      handleStartEditingOffer(specializationId);
      return;
    }

    openSpecializationModal(specializationId, target, hasOfferTypes);
  }, [handleStartEditingOffer, handleStartEditingRelease, openSpecializationModal]);

  const handleSelectEditingOffer = useCallback((offerId: string) => {
    setEditingOffer((current) => (current ? { ...current, selectedOfferId: offerId } : null));
  }, []);

  const handleAddBlankOfferDraft = useCallback(() => {
    const blankOffer = createEmptyOfferDraft();
    setEditingOffer((current) =>
      current
        ? {
            ...current,
            offers: [...current.offers, blankOffer],
            selectedOfferId: blankOffer.id || null,
          }
        : null
    );
  }, []);

  const handleDeleteSelectedDraftOffer = useCallback(() => {
    setEditingOffer((current) => {
      if (!current) return null;
      const selectedOfferId = current.selectedOfferId || current.offers[0]?.id || null;
      const remainingOffers = current.offers.filter((offer) => offer.id !== selectedOfferId);
      if (remainingOffers.length === 0) {
        const blankOffer = createEmptyOfferDraft();
        return {
          ...current,
          offers: [blankOffer],
          selectedOfferId: blankOffer.id || null,
        };
      }
      return {
        ...current,
        offers: remainingOffers,
        selectedOfferId: remainingOffers[0]?.id || null,
      };
    });
  }, []);

  const handleGenerateOfferField = useCallback(async (field: OfferFieldKey) => {
    if (!editingOffer || !activeDraftOffer) return;
    if (aiConfig.provider === 'none') {
      toast({
        title: 'AI is not configured',
        description: 'Choose an AI provider in Settings > AI Settings first.',
        variant: 'destructive',
      });
      return;
    }

    const specialization = buildOfferAiContext(editingOffer.specializationId);
    if (!specialization) {
      toast({
        title: 'Missing specialization',
        description: 'Could not find the specialization context for this offer.',
        variant: 'destructive',
      });
      return;
    }

    setOfferAiLoadingField(field);
    try {
      const response = await fetch('/api/ai/offer-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
        },
        body: JSON.stringify({
          field,
          specialization,
          currentOffer: activeDraftOffer,
          aiConfig,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to generate offer field.');
      }
      if (typeof data?.value !== 'string' || !data.value.trim()) {
        throw new Error('AI returned an empty value.');
      }

      handleUpdateEditingOffer(field, data.value.trim());
      toast({
        title: 'AI field generated',
        description: `Updated ${field === 'valueStack' ? 'value stack' : field}.`,
      });
    } catch (error) {
      toast({
        title: 'AI generation failed',
        description: error instanceof Error ? error.message : 'Unknown AI error.',
        variant: 'destructive',
      });
    } finally {
      setOfferAiLoadingField(null);
    }
  }, [activeDraftOffer, aiConfig, buildOfferAiContext, editingOffer, handleUpdateEditingOffer, isDesktopRuntime, toast]);

  const renderOfferFieldAction = useCallback((field: OfferFieldKey) => (
    aiConfig.provider === 'none' ? null : (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => void handleGenerateOfferField(field)}
        disabled={offerAiLoadingField !== null}
        title={`Generate ${field} with AI`}
      >
        {offerAiLoadingField === field ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        )}
        AI
      </Button>
    )
  ), [aiConfig.provider, handleGenerateOfferField, offerAiLoadingField]);

  const handleGenerateOffersFromTypes = useCallback(async () => {
    if (!editingOffer) return;
    if (aiConfig.provider === 'none') {
      toast({
        title: 'AI is not configured',
        description: 'Choose an AI provider in Settings > AI Settings first.',
        variant: 'destructive',
      });
      return;
    }

    const specialization = buildOfferAiContext(editingOffer.specializationId);
    const selectedTypes = specialization?.selectedOfferTypes || [];
    if (!specialization || selectedTypes.length === 0) {
      toast({
        title: 'No offer types selected',
        description: 'Add one or more offer types to this specialization first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingOffersBatch(true);
    try {
      const response = await fetch('/api/ai/offers-from-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
        },
        body: JSON.stringify({
          specialization,
          offerTypes: selectedTypes,
          currentOffers: editingOffer.offers,
          aiConfig,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to generate offers.');
      }
      const generatedOffers = Array.isArray(data?.offers) ? data.offers : [];
      if (generatedOffers.length === 0) {
        throw new Error('AI returned no offers.');
      }

      const nextOffers: OfferDraft[] = generatedOffers.map((entry: any) => ({
        ...createEmptyOfferDraft(),
        ...(entry?.offer || {}),
        offerTypeLabel: typeof entry?.offerType === 'string' ? entry.offerType : '',
        generatedByAi: true,
      }));

      setEditingOffer((current) =>
        current
          ? {
              ...current,
              offers: nextOffers,
              selectedOfferId: nextOffers[0]?.id || null,
            }
          : null
      );
      toast({
        title: 'Offers generated',
        description: `Created ${nextOffers.length} AI offer${nextOffers.length === 1 ? '' : 's'} from selected types.`,
      });
    } catch (error) {
      toast({
        title: 'Offer generation failed',
        description: error instanceof Error ? error.message : 'Unknown AI error.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingOffersBatch(false);
    }
  }, [aiConfig, buildOfferAiContext, editingOffer, isDesktopRuntime, toast]);

  const handleSaveOffer = () => {
    if (!editingOffer) return;
    const { specializationId, offers } = editingOffer;
    const normalizedOffers = offers
      .filter((offer) => {
        const fields = [offer.name, offer.outcome, offer.audience, offer.deliverables, offer.valueStack, offer.timeline, offer.price, offer.format];
        return fields.some((value) => String(value || '').trim().length > 0);
      })
      .map((offer) => ({
        id: String(offer.id || createEmptyOfferDraft().id),
        name: String(offer.name || '').trim(),
        outcome: String(offer.outcome || '').trim(),
        audience: String(offer.audience || '').trim(),
        deliverables: String(offer.deliverables || '').trim(),
        valueStack: String(offer.valueStack || '').trim(),
        timeline: String(offer.timeline || '').trim(),
        price: String(offer.price || '').trim(),
        format: String(offer.format || '').trim(),
      })) as Offer[];

    if (normalizedOffers.length === 0) {
      toast({ title: "Error", description: "Add at least one offer before saving.", variant: "destructive" });
      return;
    }
    if (normalizedOffers.some((offer) => !offer.name.trim())) {
      toast({ title: "Error", description: "Each saved offer needs a name.", variant: "destructive" });
      return;
    }

    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[specializationId] || {};
        newPlans[specializationId] = { ...currentPlan, offers: normalizedOffers };
        return newPlans;
    });

    toast({ title: "Offers Saved", description: `${normalizedOffers.length} offer${normalizedOffers.length === 1 ? '' : 's'} saved.`});
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
  
  const handleLearningPlanFieldChange = (specializationId: string, type: 'audio' | 'book', index: number, field: string, value: any) => {
    setOfferizationPlans(prev => {
      const plans = { ...prev };
      const specPlan = { ...(plans[specializationId] || {}) };
      const learningPlan = { ...(specPlan.learningPlan || {}) };
  
      if (type === 'audio') {
        const resources = [...(learningPlan.audioVideoResources || [])];
        if (resources[index]) {
          resources[index] = { ...resources[index], [field]: value };
          learningPlan.audioVideoResources = resources;
        }
      } else {
        const resources = [...(learningPlan.bookWebpageResources || [])];
        if (resources[index]) {
          resources[index] = { ...resources[index], [field]: value };
          learningPlan.bookWebpageResources = resources;
        }
      }
      specPlan.learningPlan = learningPlan;
      plans[specializationId] = specPlan;
      return plans;
    });
  };
  
  const handleAddLearningResource = (specId: string, type: 'audio' | 'book') => {
    setOfferizationPlans(prev => {
      const plans = { ...prev };
      const specPlan = { ...(plans[specId] || {}) };
      const learningPlan = { ...(specPlan.learningPlan || {}) };
  
      if (type === 'audio') {
        const newResource: LearningResourceAudio = { id: `audio_${Date.now()}`, name: '', tutor: '', totalItems: null, totalHours: null, startDate: null, completionDate: null };
        learningPlan.audioVideoResources = [...(learningPlan.audioVideoResources || []), newResource];
      } else {
        const newResource: LearningResourceBook = { id: `book_${Date.now()}`, name: '', author: '', totalPages: null, startDate: null, completionDate: null };
        learningPlan.bookWebpageResources = [...(learningPlan.bookWebpageResources || []), newResource];
      }
      specPlan.learningPlan = learningPlan;
      plans[specId] = specPlan;
      return plans;
    });
  };
  
  const handleDeleteLearningResource = (specId: string, type: 'audio' | 'book', index: number) => {
    setOfferizationPlans(prev => {
      const plans = { ...prev };
      const specPlan = { ...(plans[specId] || {}) };
      const learningPlan = { ...(specPlan.learningPlan || {}) };
  
      if (type === 'audio') {
        learningPlan.audioVideoResources = (learningPlan.audioVideoResources || []).filter((_, i) => i !== index);
      } else {
        learningPlan.bookWebpageResources = (learningPlan.bookWebpageResources || []).filter((_, i) => i !== index);
      }
      specPlan.learningPlan = learningPlan;
      plans[specId] = specPlan;
      return plans;
    });
  };

  const handleAddSkillTreePathPlan = (specId: string, spec: CoreSkill) => {
    setOfferizationPlans(prev => {
      const plans = { ...prev };
      const specPlan = { ...(plans[specId] || {}) };
      const learningPlan = { ...(specPlan.learningPlan || {}) };
      const firstSkillAreaId = spec.skillAreas[0]?.id;
      const nextPath: SkillTreePathPlan = {
        id: `path_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: `Path ${(learningPlan.skillTreePaths?.length || 0) + 1}`,
        skillAreaIds: firstSkillAreaId ? [firstSkillAreaId] : [],
        targetMicroSkills: null,
        completionDate: null,
      };
      learningPlan.skillTreePaths = [...(learningPlan.skillTreePaths || []), nextPath];
      specPlan.learningPlan = learningPlan;
      plans[specId] = specPlan;
      return plans;
    });
  };

  const handleUpdateSkillTreePathPlan = (
    specId: string,
    pathId: string,
    updates: Partial<SkillTreePathPlan>
  ) => {
    setOfferizationPlans(prev => {
      const plans = { ...prev };
      const specPlan = { ...(plans[specId] || {}) };
      const learningPlan = { ...(specPlan.learningPlan || {}) };
      learningPlan.skillTreePaths = (learningPlan.skillTreePaths || []).map((path) =>
        path.id === pathId ? { ...path, ...updates } : path
      );
      specPlan.learningPlan = learningPlan;
      plans[specId] = specPlan;
      return plans;
    });
  };

  const handleToggleSkillAreaInPath = (specId: string, pathId: string, areaId: string) => {
    setOfferizationPlans(prev => {
      const plans = { ...prev };
      const specPlan = { ...(plans[specId] || {}) };
      const learningPlan = { ...(specPlan.learningPlan || {}) };
      learningPlan.skillTreePaths = (learningPlan.skillTreePaths || []).map((path) => {
        if (path.id !== pathId) return path;
        const exists = (path.skillAreaIds || []).includes(areaId);
        const nextSkillAreaIds = exists
          ? (path.skillAreaIds || []).filter((id) => id !== areaId)
          : [...(path.skillAreaIds || []), areaId];
        return { ...path, skillAreaIds: nextSkillAreaIds };
      });
      specPlan.learningPlan = learningPlan;
      plans[specId] = specPlan;
      return plans;
    });
  };

  const handleDeleteSkillTreePathPlan = (specId: string, pathId: string) => {
    setOfferizationPlans(prev => {
      const plans = { ...prev };
      const specPlan = { ...(plans[specId] || {}) };
      const learningPlan = { ...(specPlan.learningPlan || {}) };
      learningPlan.skillTreePaths = (learningPlan.skillTreePaths || []).filter((path) => path.id !== pathId);
      specPlan.learningPlan = learningPlan;
      plans[specId] = specPlan;
      return plans;
    });
  };


  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specializations.map((spec) => {
          const plan = offerizationPlans[spec.id] || {};
          const selectedOfferTypes = plan.offerTypes || [];
          const gapAnalysis = plan.gapAnalysis;
          const releaseCount = (plan.releases || []).length;
          const offerCount = (plan.offers || []).length;
          const learningPlan = plan.learningPlan || {};
          const learningResourceCount =
          (learningPlan.audioVideoResources || []).length +
          (learningPlan.bookWebpageResources || []).length +
          (learningPlan.skillTreePaths || []).length;
          const hasGapContent = Boolean(
          (gapAnalysis?.gapTypes || []).length ||
          gapAnalysis?.strainReduction ||
          gapAnalysis?.whatYouCanFill ||
          gapAnalysis?.coreSolution ||
          gapAnalysis?.outcomeGoal
          );
          
          return (
            <Card
            key={spec.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/10 shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition-colors hover:border-primary/30"
            >
            <CardHeader className="space-y-3 border-b border-border/50 bg-gradient-to-br from-muted/25 via-background to-background px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Briefcase className="h-4 w-4"/>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold leading-tight tracking-tight text-foreground">
                      {spec.name}
                    </CardTitle>
                  </div>
                </div>
                <Badge
                variant="outline"
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                  selectedOfferTypes.length > 0
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-border/70 bg-muted/30 text-muted-foreground'
                )}
                >
                {selectedOfferTypes.length > 0 ? 'Configured' : 'Needs setup'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <button
                  type="button"
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-background/80"
                  onClick={() => handleSummaryCardClick(spec.id, 'offer-types', selectedOfferTypes.length > 0)}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Offer Types</p>
                  <p className="mt-1.5 text-base font-semibold text-foreground">{selectedOfferTypes.length}</p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-background/80"
                  onClick={() => handleSummaryCardClick(spec.id, 'gap-analysis', selectedOfferTypes.length > 0)}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Gap Analysis</p>
                  <p className="mt-1.5 text-base font-semibold text-foreground">{hasGapContent ? 'Ready' : 'Blank'}</p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-background/80"
                  onClick={() => handleSummaryCardClick(spec.id, 'learning', selectedOfferTypes.length > 0)}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Learning</p>
                  <p className="mt-1.5 text-base font-semibold text-foreground">{learningResourceCount}</p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-background/80"
                  onClick={() => handleSummaryCardClick(spec.id, 'projects', selectedOfferTypes.length > 0)}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Projects</p>
                  <p className="mt-1.5 text-base font-semibold text-foreground">{releaseCount}</p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-background/80"
                  onClick={() => handleSummaryCardClick(spec.id, 'offers', selectedOfferTypes.length > 0)}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Offers</p>
                  <p className="mt-1.5 text-base font-semibold text-foreground">{offerCount}</p>
                </button>
              </div>
              </CardHeader>
              </Card>
          )
        })}
      </div>

      <Dialog open={!!specializationModal} onOpenChange={(open) => !open && setSpecializationModal(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {specializationModal?.mode === 'gap-analysis' ? 'Gap Analysis' : 'Offer Type'}
              {activeSpecializationModalSpec ? ` • ${activeSpecializationModalSpec.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              {specializationModal?.mode === 'gap-analysis'
                ? 'Define the market gap, positioning, and outcome for this specialization.'
                : 'Choose the offer types you want to build for this specialization.'}
            </DialogDescription>
          </DialogHeader>

          {activeSpecializationModalSpec && specializationModal?.mode === 'offer-types' && (
            <div className="space-y-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 w-full justify-start rounded-xl border-border/60 bg-background/40 text-left font-normal">
                    {(activeSpecializationModalPlan.offerTypes || []).length > 0
                      ? `${(activeSpecializationModalPlan.offerTypes || []).length} selected`
                      : 'Select offer types...'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-select-trigger-width] max-h-60 overflow-y-auto">
                  {offerTypes.map((group) => (
                    <React.Fragment key={group.group}>
                      <DropdownMenuLabel>{group.group}</DropdownMenuLabel>
                      {group.items.map((item) => (
                        <DropdownMenuCheckboxItem
                          key={item.name}
                          checked={(activeSpecializationModalPlan.offerTypes || []).includes(item.name)}
                          onCheckedChange={() => handleOfferTypeChange(activeSpecializationModalSpec.id, item.name)}
                        >
                          {item.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {(activeSpecializationModalPlan.offerTypes || []).length > 0 && (
                <div className="space-y-2">
                  {(activeSpecializationModalPlan.offerTypes || []).map((offerName) => {
                    const offer = offerTypes.flatMap((group) => group.items).find((item) => item.name === offerName);
                    return offer ? (
                      <div key={offer.name} className="rounded-xl border border-border/60 bg-muted/10 p-3">
                        <p className="text-sm font-semibold text-foreground">{offer.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{offer.description}</p>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {activeSpecializationModalSpec && specializationModal?.mode === 'gap-analysis' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor={`modal-gapType-${activeSpecializationModalSpec.id}`} className="text-sm">Gap Type</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="mt-2 h-11 w-full justify-start rounded-xl border-border/60 bg-background/40 text-left font-normal">
                      {(activeSpecializationModalPlan.gapAnalysis?.gapTypes || []).length > 0
                        ? `${(activeSpecializationModalPlan.gapAnalysis?.gapTypes || []).length} selected`
                        : 'Select gap types...'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-select-trigger-width] max-h-60 overflow-y-auto">
                    {GAP_TYPES.map((group) => (
                      <React.Fragment key={group.group}>
                        <DropdownMenuLabel>{group.group}</DropdownMenuLabel>
                        {group.items.map((item) => (
                          <DropdownMenuCheckboxItem
                            key={item.name}
                            checked={(activeSpecializationModalPlan.gapAnalysis?.gapTypes || []).includes(item.name)}
                            onCheckedChange={() => handleGapTypeChange(activeSpecializationModalSpec.id, item.name)}
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
                <Label htmlFor={`modal-strain-${activeSpecializationModalSpec.id}`} className="text-sm">How will this reduce strain on the human body or mind?</Label>
                <Textarea
                  id={`modal-strain-${activeSpecializationModalSpec.id}`}
                  className="mt-2 min-h-24 rounded-xl border-border/60 bg-background/40"
                  value={activeSpecializationModalPlan.gapAnalysis?.strainReduction || ''}
                  onChange={(e) => handleGapAnalysisChange(activeSpecializationModalSpec.id, 'strainReduction', e.target.value)}
                  placeholder="Assist or automate daily manual work..."
                />
              </div>
              <div>
                <Label htmlFor={`modal-fill-${activeSpecializationModalSpec.id}`} className="text-sm">What You Can Fill</Label>
                <Textarea
                  id={`modal-fill-${activeSpecializationModalSpec.id}`}
                  className="mt-2 min-h-24 rounded-xl border-border/60 bg-background/40"
                  value={activeSpecializationModalPlan.gapAnalysis?.whatYouCanFill || ''}
                  onChange={(e) => handleGapAnalysisChange(activeSpecializationModalSpec.id, 'whatYouCanFill', e.target.value)}
                  placeholder="How can you specifically address this gap?"
                />
              </div>
              <div>
                <Label htmlFor={`modal-solution-${activeSpecializationModalSpec.id}`} className="text-sm">Core Solution / Offer</Label>
                <Textarea
                  id={`modal-solution-${activeSpecializationModalSpec.id}`}
                  className="mt-2 min-h-24 rounded-xl border-border/60 bg-background/40"
                  value={activeSpecializationModalPlan.gapAnalysis?.coreSolution || ''}
                  onChange={(e) => handleGapAnalysisChange(activeSpecializationModalSpec.id, 'coreSolution', e.target.value)}
                  placeholder="What is the core service or offer?"
                />
              </div>
              <div>
                <Label htmlFor={`modal-goal-${activeSpecializationModalSpec.id}`} className="text-sm">Outcome Goal</Label>
                <Textarea
                  id={`modal-goal-${activeSpecializationModalSpec.id}`}
                  className="mt-2 min-h-24 rounded-xl border-border/60 bg-background/40"
                  value={activeSpecializationModalPlan.gapAnalysis?.outcomeGoal || ''}
                  onChange={(e) => handleGapAnalysisChange(activeSpecializationModalSpec.id, 'outcomeGoal', e.target.value)}
                  placeholder="What is the desired result?"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setSpecializationModal(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
            <div className="relative max-h-[calc(100vh-2rem)] w-[min(98vw,1680px)] overflow-y-auto rounded-2xl border border-border/70 bg-background shadow-2xl">
                <div className="pr-20 pl-6 pt-6">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold leading-none tracking-tight">Manage Projects</h2>
                            <p className="text-sm text-muted-foreground">
                                Create and manage multiple projects for the same specialization from one workspace.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 xl:items-end">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="min-w-[300px] max-w-[420px] flex-1">
                                    <Select
                                        value={String(activeDraftProject?.id || '')}
                                        onValueChange={handleSelectEditingProject}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/20">
                                            <SelectValue placeholder="Select a project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Project Set</SelectLabel>
                                                {editingProject.releases.map((release, index) => (
                                                    <SelectItem key={release.id || index} value={String(release.id || '')}>
                                                        {release.name?.trim() || `Project ${index + 1}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Badge variant="outline">
                                    {editingProject.releases.length} draft project{editingProject.releases.length === 1 ? '' : 's'}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" onClick={handleSaveProjects}>
                                    Save Projects
                                </Button>
                                <Button type="button" variant="outline" onClick={handleAddBlankProjectDraft}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Blank Project
                                </Button>
                                <Button type="button" variant="outline" onClick={handleDeleteSelectedProjectDraft} disabled={(editingProject.releases || []).length === 0}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Selected
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingProject(null)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close project manager</span>
                </Button>
                <div className="px-6 pb-6">
                    {activeDraftProject && coreSkills.find((skill) => skill.id === editingProject.specializationId) ? (
                      <ProjectForm
                        specialization={coreSkills.find((skill) => skill.id === editingProject.specializationId) as CoreSkill}
                        release={activeDraftProject}
                        handleUpdateEditingRelease={handleUpdateEditingRelease}
                      />
                    ) : null}
                </div>
            </div>
        </div>
      )}

      {activeLearningSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
            <div className="relative max-h-[calc(100vh-2rem)] w-[min(98vw,1680px)] overflow-y-auto rounded-2xl border border-border/70 bg-background shadow-2xl">
                <div className="pr-20 pl-6 pt-6">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold leading-none tracking-tight">Manage Learning Plan</h2>
                            <p className="text-sm text-muted-foreground">
                                Organize skill-tree paths and learning resources for {activeLearningSpec.name} in one workspace.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">
                                {(activeLearningPlan.skillTreePaths || []).length} path{(activeLearningPlan.skillTreePaths || []).length === 1 ? '' : 's'}
                            </Badge>
                            <Badge variant="outline">
                                {((activeLearningPlan.audioVideoResources || []).length + (activeLearningPlan.bookWebpageResources || []).length)} resource{((activeLearningPlan.audioVideoResources || []).length + (activeLearningPlan.bookWebpageResources || []).length) === 1 ? '' : 's'}
                            </Badge>
                            <Button type="button" onClick={() => setEditingLearningPlanSpecId(null)}>
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingLearningPlanSpecId(null)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close learning plan manager</span>
                </Button>
                <div className="px-6 pb-6">
                    <LearningPlannerForm
                        spec={activeLearningSpec}
                        learningPlan={activeLearningPlan}
                        pdfResources={pdfResources}
                        openPdfViewer={openPdfViewer}
                        onOpenPdfLinkPicker={openPdfLinkPicker}
                        onUnlinkPdfResource={handleUnlinkPdfResource}
                        onAddSkillTreePathPlan={handleAddSkillTreePathPlan}
                        onUpdateSkillTreePathPlan={handleUpdateSkillTreePathPlan}
                        onToggleSkillAreaInPath={handleToggleSkillAreaInPath}
                        onDeleteSkillTreePathPlan={handleDeleteSkillTreePathPlan}
                        onAddLearningResource={handleAddLearningResource}
                        onLearningPlanFieldChange={handleLearningPlanFieldChange}
                        onDeleteLearningResource={handleDeleteLearningResource}
                    />
                </div>
            </div>
        </div>
      )}

      {editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
            <div className="relative max-h-[calc(100vh-2rem)] w-[min(98vw,1680px)] overflow-y-auto rounded-2xl border border-border/70 bg-background shadow-2xl">
                <div className="pr-20 pl-6 pt-6">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold leading-none tracking-tight">Manage Offers</h2>
                            <p className="text-sm text-muted-foreground">
                                Generate and manage multiple offers for the same specialization from one workspace.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 xl:items-end">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="min-w-[300px] max-w-[420px] flex-1">
                                    <Select
                                        value={String(activeDraftOffer?.id || '')}
                                        onValueChange={handleSelectEditingOffer}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/20">
                                            <SelectValue placeholder="Select an offer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Offer Set</SelectLabel>
                                                {editingOffer.offers.map((offer, index) => (
                                                    <SelectItem key={offer.id || index} value={String(offer.id || '')}>
                                                        {offer.name?.trim() || `Offer ${index + 1}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Badge variant="outline">
                                    {editingOffer.offers.length} draft offer{editingOffer.offers.length === 1 ? '' : 's'}
                                </Badge>
                                <Badge variant="outline">
                                    {(offerizationPlans[editingOffer.specializationId]?.offerTypes || []).length} type{(offerizationPlans[editingOffer.specializationId]?.offerTypes || []).length === 1 ? '' : 's'}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={() => void handleGenerateOffersFromTypes()} disabled={isGeneratingOffersBatch}>
                                {isGeneratingOffersBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate From Offer Types
                            </Button>
                            <Button type="button" variant="outline" onClick={handleAddBlankOfferDraft}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Blank Offer
                            </Button>
                            <Button type="button" variant="outline" onClick={handleDeleteSelectedDraftOffer} disabled={(editingOffer.offers || []).length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Selected
                            </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingOffer(null)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close offer manager</span>
                </Button>
                <div className="px-6 pb-6">
                        <div className="grid gap-4 py-3 xl:grid-cols-2">
                            <div className="space-y-4">
                                {activeDraftOffer ? (
                                  <div className="rounded-2xl border border-border/60 bg-muted/15 p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h3 className="text-[1.7rem] font-bold leading-tight tracking-tight text-foreground">
                                                {activeDraftOffer.name?.trim() || 'Selected Offer Preview'}
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {activeDraftOffer.format?.trim() || activeDraftOffer.offerTypeLabel || 'Offer preview'}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="shrink-0">
                                            {activeDraftOffer.offerTypeLabel || 'Concept'}
                                        </Badge>
                                    </div>

                                    <div className="mt-6 space-y-5">
                                        <div>
                                            <p className="text-base font-semibold text-foreground">Outcome</p>
                                            <div className="mt-2 text-sm leading-7 text-muted-foreground">
                                                <OfferPreviewMarkdown content={activeDraftOffer.outcome} fallback="No outcome yet" />
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-base font-semibold text-foreground">Audience</p>
                                            <div className="mt-2 text-sm leading-7 text-muted-foreground">
                                                <OfferPreviewMarkdown content={activeDraftOffer.audience} fallback="No audience yet" />
                                            </div>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Timeline</p>
                                                <p className="mt-2 text-sm leading-7 text-foreground">{activeDraftOffer.timeline || 'Not set'}</p>
                                            </div>
                                            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Price</p>
                                                <p className="mt-2 text-sm leading-7 text-foreground">{activeDraftOffer.price || 'Not set'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-base font-semibold text-foreground">Deliverables</p>
                                            <div className="mt-2 text-sm leading-7 text-muted-foreground">
                                                <OfferPreviewMarkdown content={activeDraftOffer.deliverables} fallback="No deliverables yet" />
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-base font-semibold text-foreground">Value Stack</p>
                                            <div className="mt-2 text-sm leading-7 text-muted-foreground">
                                                <OfferPreviewMarkdown content={activeDraftOffer.valueStack} fallback="No value stack yet" />
                                            </div>
                                        </div>
                                    </div>
                                  </div>
                                ) : null}
                            </div>

                            <div className="space-y-3">
                            {activeDraftOffer ? (
                              <div className="grid gap-3 lg:grid-cols-2">
                            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderOfferFieldAction('name')}
                                        <Label htmlFor="offer-name">1. Offer Name</Label>
                                    </div>
                                </div>
                                <Input id="offer-name" value={activeDraftOffer.name || ''} onChange={(e) => handleUpdateEditingOffer('name', e.target.value)} placeholder="e.g., Launch Starter, GPU Boost Sprint" />
                            </div>
                            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderOfferFieldAction('timeline')}
                                        <Label htmlFor="offer-timeline">6. Timeline</Label>
                                    </div>
                                </div>
                                <Input id="offer-timeline" value={activeDraftOffer.timeline || ''} onChange={(e) => handleUpdateEditingOffer('timeline', e.target.value)} placeholder="e.g., Delivered in 3 working days" />
                            </div>
                            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderOfferFieldAction('outcome')}
                                        <Label htmlFor="offer-outcome">2. Outcome / Promise</Label>
                                    </div>
                                </div>
                                <Textarea className="min-h-[92px] resize-y" id="offer-outcome" value={activeDraftOffer.outcome || ''} onChange={(e) => handleUpdateEditingOffer('outcome', e.target.value)} placeholder="Get [X result] in [Y time] using [Z method]" />
                            </div>
                            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderOfferFieldAction('audience')}
                                        <Label htmlFor="offer-audience">3. Who It's For (Audience)</Label>
                                    </div>
                                </div>
                                <Textarea className="min-h-[92px] resize-y" id="offer-audience" value={activeDraftOffer.audience || ''} onChange={(e) => handleUpdateEditingOffer('audience', e.target.value)} placeholder="Describe the ideal client segment" />
                            </div>
                            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderOfferFieldAction('deliverables')}
                                        <Label htmlFor="offer-deliverables">4. Core Deliverables</Label>
                                    </div>
                                </div>
                                <Textarea className="min-h-[110px] resize-y" id="offer-deliverables" value={activeDraftOffer.deliverables || ''} onChange={(e) => handleUpdateEditingOffer('deliverables', e.target.value)} placeholder="List tangible items the client will receive, one per line." />
                            </div>
                            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderOfferFieldAction('valueStack')}
                                        <Label htmlFor="offer-valueStack">5. Value Stack</Label>
                                    </div>
                                </div>
                                <Textarea className="min-h-[110px] resize-y" id="offer-valueStack" value={activeDraftOffer.valueStack || ''} onChange={(e) => handleUpdateEditingOffer('valueStack', e.target.value)} placeholder="List all included items, one per line. Include core work, support, and bonuses." />
                            </div>
                            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderOfferFieldAction('price')}
                                        <Label htmlFor="offer-price">7. Price</Label>
                                    </div>
                                </div>
                                <Input id="offer-price" value={activeDraftOffer.price || ''} onChange={(e) => handleUpdateEditingOffer('price', e.target.value)} placeholder="e.g., $500 flat (50% upfront)" />
                            </div>
                             <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderOfferFieldAction('format')}
                                        <Label htmlFor="offer-format">8. Format / Delivery</Label>
                                    </div>
                                </div>
                                <Textarea className="min-h-[92px] resize-y" id="offer-format" value={activeDraftOffer.format || ''} onChange={(e) => handleUpdateEditingOffer('format', e.target.value)} placeholder="How is the service delivered? (e.g., GitHub, Loom, Notion)" />
                            </div>
                              </div>
                            ) : null}
                            </div>
                        </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 pb-6 pt-4">
                    <Button variant="outline" onClick={() => setEditingOffer(null)}>Cancel</Button>
                    <Button onClick={handleSaveOffer}>Save Offers</Button>
                </div>
            </div>
        </div>
      )}
      <Dialog open={pdfLinkPicker.isOpen} onOpenChange={(open) => !open && closePdfLinkPicker()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select PDF Resource Card</DialogTitle>
            <DialogDescription>
              Search and select a PDF resource card to link with this learning plan item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search PDF cards..."
              value={pdfSearchTerm}
              onChange={(e) => setPdfSearchTerm(e.target.value)}
            />
            <ScrollArea className="h-72 rounded-md border">
              <div className="p-2 space-y-1">
                {filteredPdfResources.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground text-center">No PDF resource cards found.</p>
                ) : (
                  filteredPdfResources.map((resource) => (
                    <button
                      key={resource.id}
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition"
                      onClick={() => handleSelectPdfResourceForLearningPlan(resource.id)}
                    >
                      <p className="text-sm font-medium truncate">{resource.name}</p>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePdfLinkPicker}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const ProjectForm = ({ specialization, release, handleUpdateEditingRelease }: {
    specialization: CoreSkill,
    release: Partial<Release>,
    handleUpdateEditingRelease: (field: keyof Release, value: any) => void,
}) => {
    const { projects, coreSkills, mindsetCards, kanbanBoards, deepWorkDefinitions, settings } = useAuth();
    const { toast } = useToast();
    const isDesktopRuntime = typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
    const aiConfig = useMemo(() => getAiConfigFromSettings(settings, isDesktopRuntime), [settings, isDesktopRuntime]);
    const [technicalDetails, setTechnicalDetails] = useState<ProjectTechnicalSection[]>(
        () => normalizeProjectTechnicalDetails(release.technicalDetails)
    );
    const [isGeneratingTechnicalDetails, setIsGeneratingTechnicalDetails] = useState(false);
    const [rephrasingTechnicalLineKey, setRephrasingTechnicalLineKey] = useState<string | null>(null);
    const workflowStages = useMemo(() => ({
        botheringPointId: release.workflowStages?.botheringPointId || null,
        botheringText: release.workflowStages?.botheringText || '',
        stageLabels: {
            idea: release.workflowStages?.stageLabels?.idea || 'Idea -> pick simplest solution',
            code: release.workflowStages?.stageLabels?.code || 'Code -> make it run',
            break: release.workflowStages?.stageLabels?.break || 'Break -> observe failure',
            fix: release.workflowStages?.stageLabels?.fix || 'Fix -> improve system',
        },
        ideaItems: release.workflowStages?.ideaItems || [],
        codeItems: release.workflowStages?.codeItems || [],
        breakItems: release.workflowStages?.breakItems || [],
        fixItems: release.workflowStages?.fixItems || [],
    }), [release.workflowStages]);
    const normalizeStageItem = (item: string | { text: string; completed?: boolean }) =>
        typeof item === 'string' ? { text: item, completed: false } : { text: item.text || '', completed: !!item.completed };
    const allBotherings = useMemo(() => {
        return (mindsetCards || [])
            .filter(card => card.id.startsWith('mindset_botherings_'))
            .flatMap(card => (card.points || []).map(point => ({
                id: point.id,
                text: point.text,
                type: card.id.replace('mindset_botherings_', ''),
            })));
    }, [mindsetCards]);
    const projectsInDomain = useMemo(() => projects.filter(p => p.domainId === specialization.domainId), [specialization.domainId, projects]);
    const matchedProject = useMemo(
        () =>
            projectsInDomain.find((project) => project.name === release.name) ||
            projects.find((project) => project.name === release.name) ||
            null,
        [projects, projectsInDomain, release.name]
    );
    const linkedKanbanBoard = useMemo(() => {
        const projectBoards = kanbanBoards.filter((board) => (board.boardType || 'project') === 'project');
        return (
            projectBoards.find((board) => board.releaseId === release.id && board.specializationId === specialization.id) ||
            projectBoards.find((board) => matchedProject?.id && board.projectId === matchedProject.id) ||
            projectBoards.find((board) => board.name === release.name && board.specializationId === specialization.id) ||
            projectBoards.find((board) => board.releaseId === release.id) ||
            null
        );
    }, [kanbanBoards, matchedProject?.id, release.id, release.name, specialization.id]);
    const stageCardsByKey = useMemo(() => {
        if (!linkedKanbanBoard) {
            return {
                ideaItems: [] as KanbanCard[],
                codeItems: [] as KanbanCard[],
                breakItems: [] as KanbanCard[],
                fixItems: [] as KanbanCard[],
                doneItems: [] as KanbanCard[],
            };
        }
        const listIdsByStage = new Map<string, string[]>();
        linkedKanbanBoard.lists.forEach((list) => {
            const normalizedTitle = (list.title || '').trim().toLowerCase();
            if (!normalizedTitle) return;
            const existing = listIdsByStage.get(normalizedTitle) || [];
            existing.push(list.id);
            listIdsByStage.set(normalizedTitle, existing);
        });

        const cardsForStage = (stage: 'idea' | 'code' | 'break' | 'fix' | 'done') => {
            const stageListIds = new Set<string>([
                ...(listIdsByStage.get(stage) || []),
                `${linkedKanbanBoard.id}_${stage}`,
                `${linkedKanbanBoard.id}_list_${stage}`,
            ]);

            return linkedKanbanBoard.cards
                .filter((card) => {
                    if (card.archived) return false;
                    if (stageListIds.has(card.listId)) return true;
                    if (stage !== 'done' && card.workflowStageKey === stage) return true;
                    return false;
                })
                .sort((a, b) => a.position - b.position);
        };

        return {
            ideaItems: cardsForStage('idea'),
            codeItems: cardsForStage('code'),
            breakItems: cardsForStage('break'),
            fixItems: cardsForStage('fix'),
            doneItems: cardsForStage('done'),
        };
    }, [linkedKanbanBoard]);

    const doneIntentionMap = useMemo(() => {
        const intentionIds = new Set<string>();
        stageCardsByKey.doneItems.forEach((card) => {
            (card.linkedIntentionIds || []).forEach((id) => {
                if (id) intentionIds.add(id);
            });
            (card.checklist || []).forEach((item) => {
                if (item.linkedIntentionId) intentionIds.add(item.linkedIntentionId);
            });
        });

        const microSkillIntentions = new Map<string, { id: string; name: string }[]>();
        Array.from(intentionIds).forEach((intentionId) => {
            const definition = deepWorkDefinitions.find((entry) => entry.id === intentionId);
            if (!definition) return;

            const linkedIds = new Set<string>(definition.linkedMicroSkillIds || []);
            coreSkills
                .filter((skill) => skill.type === 'Specialization')
                .forEach((skill) => {
                    skill.skillAreas.forEach((area) => {
                        area.microSkills.forEach((microSkill) => {
                            if (
                                (definition.category || '').trim().toLowerCase() === microSkill.name.trim().toLowerCase() ||
                                linkedIds.has(microSkill.id)
                            ) {
                                const existing = microSkillIntentions.get(microSkill.id) || [];
                                if (!existing.some((item) => item.id === definition.id)) {
                                    existing.push({ id: definition.id, name: definition.name });
                                    microSkillIntentions.set(microSkill.id, existing);
                                }
                            }
                        });
                    });
                });
        });

        return microSkillIntentions;
    }, [coreSkills, deepWorkDefinitions, stageCardsByKey.doneItems]);

    const doneChecklistFallbackIntentions = useMemo(() => {
        const items: { id: string; name: string }[] = [];
        stageCardsByKey.doneItems.forEach((card) => {
            (card.checklist || []).forEach((item) => {
                if (!item.completed) return;
                if (item.linkedIntentionId) return;
                const name = (item.text || '').trim();
                if (!name) return;
                const id = `done-check-${card.id}-${item.id}`;
                if (!items.some((entry) => entry.id === id)) {
                    items.push({ id, name });
                }
            });
        });
        return items;
    }, [stageCardsByKey.doneItems]);

    const skillsUsedRows = useMemo(() => {
        const rowsMap = new Map<string, {
            microSkillId: string;
            specializationName: string;
            skillAreaName: string;
            skillAreaPurpose: string;
            microSkillName: string;
            intentions: { id: string; name: string }[];
        }>();

        const upsertRow = (
            microSkillId: string,
            specializationName: string,
            skillAreaName: string,
            skillAreaPurpose: string,
            microSkillName: string,
            intentions: { id: string; name: string }[] = []
        ) => {
            const existing = rowsMap.get(microSkillId);
            if (!existing) {
                rowsMap.set(microSkillId, {
                    microSkillId,
                    specializationName,
                    skillAreaName,
                    skillAreaPurpose,
                    microSkillName,
                    intentions: [...intentions],
                });
                return;
            }
            const mergedIntentions = [...existing.intentions];
            intentions.forEach((intention) => {
                if (!mergedIntentions.some((item) => item.id === intention.id)) {
                    mergedIntentions.push(intention);
                }
            });
            rowsMap.set(microSkillId, {
                ...existing,
                skillAreaPurpose: existing.skillAreaPurpose || skillAreaPurpose,
                intentions: mergedIntentions,
            });
        };

        coreSkills
            .filter((skill) => skill.type === 'Specialization')
            .forEach((skill) => {
                skill.skillAreas.forEach((area) => {
                    area.microSkills.forEach((microSkill) => {
                        const intentions = doneIntentionMap.get(microSkill.id) || [];
                        if (intentions.length > 0) {
                            upsertRow(microSkill.id, skill.name, area.name, area.purpose || '', microSkill.name, intentions);
                        }
                    });
                });
            });

        (matchedProject?.features || []).forEach((feature) => {
            (feature.linkedSkills || []).forEach((link) => {
                coreSkills
                    .filter((skill) => skill.type === 'Specialization')
                    .forEach((skill) => {
                        skill.skillAreas.forEach((area) => {
                            const microSkill = area.microSkills.find((item) => item.id === link.microSkillId);
                            if (!microSkill) return;
                            upsertRow(
                                microSkill.id,
                                skill.name,
                                area.name,
                                area.purpose || '',
                                microSkill.name,
                                (() => {
                                    const directIntentions = doneIntentionMap.get(microSkill.id) || [];
                                    return directIntentions.length > 0 ? directIntentions : doneChecklistFallbackIntentions;
                                })()
                            );
                        });
                    });
            });
        });

        return Array.from(rowsMap.values()).sort((a, b) =>
            `${a.skillAreaName} ${a.microSkillName}`.localeCompare(`${b.skillAreaName} ${b.microSkillName}`)
        );
    }, [coreSkills, doneChecklistFallbackIntentions, doneIntentionMap, matchedProject?.features]);

    useEffect(() => {
        setTechnicalDetails(normalizeProjectTechnicalDetails(release.technicalDetails));
    }, [release.id, release.technicalDetails]);

    const syncTechnicalDetailsToRelease = useCallback((next: ProjectTechnicalSection[]) => {
        const normalized = normalizeProjectTechnicalDetails(next);
        setTechnicalDetails(normalized);
        handleUpdateEditingRelease('technicalDetails' as keyof Release, normalized);
    }, [handleUpdateEditingRelease]);

    const handleTechnicalDetailLineChange = useCallback((title: ProjectTechnicalSection['title'], lineIndex: number, value: string) => {
        const next = normalizeProjectTechnicalDetails(technicalDetails).map((section) => (
            section.title === title
                ? {
                    ...section,
                    content: section.content.map((line, index) => index === lineIndex ? value : line),
                  }
                : section
        ));
        syncTechnicalDetailsToRelease(next);
    }, [syncTechnicalDetailsToRelease, technicalDetails]);

    const handleAddTechnicalDetailLine = useCallback((title: ProjectTechnicalSection['title']) => {
        const next = normalizeProjectTechnicalDetails(technicalDetails).map((section) => (
            section.title === title
                ? { ...section, content: [...section.content, 'New point'] }
                : section
        ));
        syncTechnicalDetailsToRelease(next);
    }, [syncTechnicalDetailsToRelease, technicalDetails]);

    const handleRephraseTechnicalDetailLine = useCallback(async (title: ProjectTechnicalSection['title'], lineIndex: number, line: string) => {
        if (aiConfig.provider === 'none') {
            toast({
                title: 'AI is not configured',
                description: 'Choose an AI provider in Settings > AI Settings first.',
                variant: 'destructive',
            });
            return;
        }

        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        const lineKey = `${title}-${lineIndex}`;
        setRephrasingTechnicalLineKey(lineKey);
        try {
            const response = await fetch('/api/ai/project-technical-line', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
                },
                body: JSON.stringify({
                    sectionTitle: title,
                    projectName: release.name || '',
                    line: trimmedLine,
                    aiConfig,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to rephrase technical detail.');
            }

            const nextValue = typeof data?.value === 'string' ? data.value.trim() : '';
            if (!nextValue) {
                throw new Error('AI returned an empty rephrased line.');
            }

            const next = normalizeProjectTechnicalDetails(technicalDetails).map((section) => (
                section.title === title
                    ? {
                        ...section,
                        content: section.content.map((entry, index) => index === lineIndex ? nextValue : entry),
                      }
                    : section
            ));
            syncTechnicalDetailsToRelease(next);
        } catch (error) {
            toast({
                title: 'AI rephrase failed',
                description: error instanceof Error ? error.message : 'Unknown AI error.',
                variant: 'destructive',
            });
        } finally {
            setRephrasingTechnicalLineKey((current) => current === lineKey ? null : current);
        }
    }, [aiConfig, isDesktopRuntime, release.name, syncTechnicalDetailsToRelease, technicalDetails, toast]);

    const normalizedTechnicalDetails = normalizeProjectTechnicalDetails(technicalDetails);

    const handleGenerateTechnicalDetails = useCallback(async () => {
        if (aiConfig.provider === 'none') {
            toast({
                title: 'AI is not configured',
                description: 'Choose an AI provider in Settings > AI Settings first.',
                variant: 'destructive',
            });
            return;
        }

        setIsGeneratingTechnicalDetails(true);
        try {
            const response = await fetch('/api/ai/project-technical-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
                },
                body: JSON.stringify({
                    project: {
                        name: release.name || '',
                        description: release.description || '',
                        githubLink: release.githubLink || '',
                        demoLink: release.demoLink || '',
                    },
                    existingSections: normalizedTechnicalDetails,
                    skillsUsed: skillsUsedRows.map((row) => ({
                        specialization: row.specializationName,
                        skillArea: row.skillAreaName,
                        skillAreaPurpose: row.skillAreaPurpose,
                        microSkill: row.microSkillName,
                        intentions: row.intentions.map((item) => item.name),
                    })),
                    doneCards: stageCardsByKey.doneItems.map((card) => ({
                        title: card.title,
                        description: card.description,
                        checklist: (card.checklist || [])
                            .filter((item) => item.completed)
                            .map((item) => item.text)
                            .filter(Boolean),
                    })),
                    aiConfig,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to generate technical details.');
            }
            if (!Array.isArray(data?.sections)) {
                throw new Error('AI returned invalid technical details.');
            }

            const generatedSections = normalizeProjectTechnicalDetails(data.sections as ProjectTechnicalSection[]);
            const mergedSections = normalizeProjectTechnicalDetails(normalizedTechnicalDetails).map((section) => {
                const generated = generatedSections.find((item) => item.title === section.title);
                const existingNormalized = new Set(section.content.map((item) => normalizeTechnicalDetailLineForComparison(item)));
                const additionalContent = (generated?.content || []).filter((item) => {
                    const normalized = normalizeTechnicalDetailLineForComparison(item);
                    return normalized && !existingNormalized.has(normalized);
                });
                return {
                    ...section,
                    content: [...section.content, ...additionalContent],
                };
            });

            syncTechnicalDetailsToRelease(mergedSections);
        } catch (error) {
            toast({
                title: 'AI generation failed',
                description: error instanceof Error ? error.message : 'Unknown AI error.',
                variant: 'destructive',
            });
        } finally {
            setIsGeneratingTechnicalDetails(false);
        }
    }, [aiConfig, isDesktopRuntime, normalizedTechnicalDetails, release.demoLink, release.description, release.githubLink, release.name, skillsUsedRows, stageCardsByKey.doneItems, syncTechnicalDetailsToRelease, toast]);

    const updateWorkflowStages = (next: typeof workflowStages) => {
        handleUpdateEditingRelease('workflowStages' as keyof Release, next);
    };
    
    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h3 className="text-2xl font-bold tracking-tight text-foreground">
                            {release.name?.trim() || 'Project Details'}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Shape the project scope, timeline, delivery links, and execution stages in one place.
                        </p>
                    </div>
                    <div className="grid min-w-[260px] grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Target Date</p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                                {release.launchDate ? format(parseISO(release.launchDate), 'PPP') : 'Not set'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Portfolio</p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                                {release.addToPortfolio ? 'Included' : 'Private'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5 rounded-2xl border border-border/60 bg-muted/15 p-4 md:col-span-2">
                            <Label htmlFor="release-name">Project Name</Label>
                          <Input
                            id="release-name"
                            className="h-11 rounded-xl"
                            value={release.name || ''}
                            onChange={(e) => handleUpdateEditingRelease('name', e.target.value)}
                            placeholder="Enter a project name"
                            list={`project-name-suggestions-${specialization.id}`}
                          />
                          <datalist id={`project-name-suggestions-${specialization.id}`}>
                            {projectsInDomain.map((proj) => (
                              <option key={proj.id} value={proj.name} />
                            ))}
                          </datalist>
                        </div>

                        <div className="space-y-1.5 rounded-2xl border border-border/60 bg-muted/15 p-4 md:col-span-2">
                            <Label>Bothering -&gt; define pain</Label>
                            <Select
                                value={workflowStages.botheringPointId || ''}
                                onValueChange={(pointId) => {
                                    const selected = allBotherings.find(b => b.id === pointId);
                                    updateWorkflowStages({
                                        ...workflowStages,
                                        botheringPointId: pointId,
                                        botheringText: selected?.text || '',
                                    });
                                }}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Select from botherings list..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allBotherings.map(b => (
                                        <SelectItem key={b.id} value={b.id}>
                                            [{b.type}] {b.text}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {workflowStages.botheringText && (
                                <div className="rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
                                    {workflowStages.botheringText}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5 rounded-2xl border border-border/60 bg-muted/15 p-4">
                            <Label htmlFor="release-date">Est. Completion Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="release-date" variant="outline" className="h-11 w-full justify-start rounded-xl text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {release.launchDate ? format(parseISO(release.launchDate), 'PPP') : 'Select a date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={release.launchDate ? parseISO(release.launchDate) : new Date()} onSelect={(date) => handleUpdateEditingRelease('launchDate', format(date as Date, 'yyyy-MM-dd'))} />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-1.5 rounded-2xl border border-border/60 bg-muted/15 p-4">
                            <Label htmlFor="add-to-portfolio">Visibility</Label>
                            <div className="flex h-11 items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3">
                                <div>
                                    <p className="text-sm font-medium text-foreground">Add to Portfolio</p>
                                    <p className="text-xs text-muted-foreground">Show this project on the Portfolio page</p>
                                </div>
                                <Checkbox
                                    id="add-to-portfolio"
                                    checked={release.addToPortfolio}
                                    onCheckedChange={(checked) => handleUpdateEditingRelease('addToPortfolio', !!checked)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 rounded-2xl border border-border/60 bg-muted/15 p-4 md:col-span-2">
                            <Label htmlFor="release-desc">Description</Label>
                            <Textarea
                                id="release-desc"
                                className="min-h-[110px] rounded-xl"
                                value={release.description || ''}
                                onChange={(e) => handleUpdateEditingRelease('description', e.target.value)}
                                placeholder="What is the goal of this project?"
                            />
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 md:col-span-2">
                            <div className="mb-3">
                                <h4 className="text-base font-semibold text-foreground">Links</h4>
                                <p className="text-sm text-muted-foreground">Attach the project repo and live demo if available.</p>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="github-link">GitHub Link</Label>
                                    <Input id="github-link" className="rounded-xl" value={release.githubLink || ''} onChange={(e) => handleUpdateEditingRelease('githubLink', e.target.value)} placeholder="https://github.com/user/repo"/>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="demo-link">Demo Link</Label>
                                    <Input id="demo-link" className="rounded-xl" value={release.demoLink || ''} onChange={(e) => handleUpdateEditingRelease('demoLink', e.target.value)} placeholder="https://my-app.vercel.app"/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                        <div className="mb-3">
                            <h4 className="text-base font-semibold text-foreground">Execution Stages</h4>
                            <p className="text-sm text-muted-foreground">Keep the project flow aligned with the linked Kanban board.</p>
                        </div>

                        <div className="space-y-3">
                            <div className="grid gap-3 xl:grid-cols-2">
                                {[
                                    { key: 'ideaItems', labelKey: 'idea', tone: 'Idea' },
                                    { key: 'codeItems', labelKey: 'code', tone: 'Code' },
                                    { key: 'breakItems', labelKey: 'break', tone: 'Break' },
                                    { key: 'fixItems', labelKey: 'fix', tone: 'Fix' },
                                ].map(stage => (
                                    <div key={stage.key} className="space-y-2 rounded-xl border border-border/60 bg-background/30 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{stage.tone}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {stageCardsByKey[stage.key as 'ideaItems' | 'codeItems' | 'breakItems' | 'fixItems'].length} cards
                                            </span>
                                        </div>
                                        <div className="space-y-2 rounded-xl border border-dashed border-border/60 bg-muted/10 p-3">
                                            {stageCardsByKey[stage.key as 'ideaItems' | 'codeItems' | 'breakItems' | 'fixItems'].length > 0 ? (
                                                stageCardsByKey[stage.key as 'ideaItems' | 'codeItems' | 'breakItems' | 'fixItems'].map((card) => (
                                                    <div key={card.id} className="rounded-lg border border-border/50 bg-background/60 px-3 py-2">
                                                        <div className="text-sm font-medium">{card.title}</div>
                                                        {card.description && (
                                                            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{card.description}</div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-muted-foreground">
                                                    No Kanban cards in this stage yet. Add cards from the Kanban board.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 xl:min-w-0">
                    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h4 className="text-base font-semibold text-foreground">Technical Details</h4>
                                <p className="text-sm text-muted-foreground">Generate concise technical notes from the inferred skills used in this project.</p>
                            </div>
                            {aiConfig.provider !== 'none' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleGenerateTechnicalDetails()}
                                disabled={isGeneratingTechnicalDetails}
                              >
                                {isGeneratingTechnicalDetails ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                Generate
                              </Button>
                            ) : null}
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                            <div className="space-y-5">
                                {normalizedTechnicalDetails.map((section, index) => (
                                    <div key={`${section.title}-${index}`} className={index > 0 ? "border-t border-border/30 pt-4" : ""}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                {index + 1}. {section.title}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    aria-label={`Add point to ${section.title}`}
                                                    onClick={() => handleAddTechnicalDetailLine(section.title)}
                                                >
                                                    <PlusCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {section.content.length > 0 ? section.content.map((line, lineIndex) => (
                                                <div
                                                    key={`${section.title}-${lineIndex}`}
                                                    className="group flex items-start gap-2 rounded-md px-1 py-1 transition-colors hover:bg-background/20"
                                                >
                                                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/70" />
                                                    <div
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        className="min-h-[24px] flex-1 whitespace-pre-wrap break-words rounded-sm text-sm leading-6 text-foreground outline-none"
                                                        role="textbox"
                                                        aria-label={`${section.title} point ${lineIndex + 1}`}
                                                        onBlur={(e) => handleTechnicalDetailLineChange(section.title, lineIndex, e.currentTarget.textContent || '')}
                                                    >
                                                        {line}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground focus-visible:opacity-100"
                                                        onClick={() => void handleRephraseTechnicalDetailLine(section.title, lineIndex, line)}
                                                        disabled={rephrasingTechnicalLineKey === `${section.title}-${lineIndex}` || aiConfig.provider === 'none'}
                                                        aria-label={`Rephrase ${section.title} point ${lineIndex + 1}`}
                                                    >
                                                        {rephrasingTechnicalLineKey === `${section.title}-${lineIndex}` ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            )) : (
                                                <div className="px-1 py-2 text-sm text-muted-foreground">
                                                    No points yet. Generate from AI or add your own notes here.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                        <div className="mb-3">
                            <h4 className="text-base font-semibold text-foreground">Skills Used</h4>
                            <p className="text-sm text-muted-foreground">Automatically inferred from this project&apos;s linked skills and Kanban Done cards with linked intentions.</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                            <ScrollArea className="max-h-64">
                                <div className="space-y-2 pr-1">
                                    {skillsUsedRows.length > 0 ? skillsUsedRows.map((row) => (
                                        <div key={row.microSkillId} className="rounded-lg border border-border/40 bg-background/40 px-3 py-3">
                                            <p className="text-sm font-semibold text-foreground">
                                                {row.skillAreaName} &gt; {row.microSkillName}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">{row.specializationName}</p>
                                            {row.skillAreaPurpose ? (
                                                <p className="mt-1 text-xs text-muted-foreground/90">{row.skillAreaPurpose}</p>
                                            ) : null}
                                            <div className="mt-2 space-y-1">
                                                {row.intentions.map((intention) => (
                                                    <div key={intention.id} className="text-xs text-muted-foreground">
                                                        {intention.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="py-6 text-center text-xs text-muted-foreground">
                                            No skills could be inferred yet. Add linked skills to the project or move intention-linked cards into Done on this project&apos;s Kanban board.
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 xl:min-w-0">
                    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h4 className="text-base font-semibold text-foreground">Done</h4>
                                <p className="text-sm text-muted-foreground">Completed Kanban cards for this project.</p>
                            </div>
                            <Badge variant="outline">
                                {stageCardsByKey.doneItems.length} card{stageCardsByKey.doneItems.length === 1 ? '' : 's'}
                            </Badge>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                            <ScrollArea className="max-h-72">
                                <div className="space-y-2 pr-1">
                                    {stageCardsByKey.doneItems.length > 0 ? (
                                        stageCardsByKey.doneItems.map((card) => (
                                            <div key={card.id} className="rounded-2xl border border-border/40 bg-background/40 p-4">
                                                <div className="mb-3 flex items-start justify-between gap-3">
                                                    <Badge className="bg-emerald-700/80 text-white hover:bg-emerald-700/80">Done</Badge>
                                                    <div className="rounded-md border border-border/50 bg-background/50 px-2 py-1 text-[11px] text-muted-foreground">
                                                        {linkedKanbanBoard?.name || 'Kanban Board'}
                                                    </div>
                                                </div>
                                                <div className="text-lg font-semibold leading-tight text-foreground">{card.title}</div>
                                                {card.labelIds.length > 0 && linkedKanbanBoard ? (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {card.labelIds.map((labelId) => {
                                                            const label = linkedKanbanBoard.labels.find((item) => item.id === labelId);
                                                            if (!label) return null;
                                                            return (
                                                                <span
                                                                    key={label.id}
                                                                    className="rounded-full border border-emerald-700/40 bg-emerald-950/30 px-2.5 py-1 text-[11px] text-emerald-200"
                                                                >
                                                                    {label.title}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : null}
                                                {card.description ? (
                                                    <div className="mt-3 text-xs leading-6 text-muted-foreground line-clamp-5 whitespace-pre-wrap">
                                                        {card.description}
                                                    </div>
                                                ) : null}
                                                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="rounded-md border border-border/50 bg-background/50 px-2 py-1">
                                                        {card.checklist.filter((item) => item.completed).length}/{card.checklist.length} checklist
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="py-6 text-center text-xs text-muted-foreground">
                                            No completed Kanban cards in this project yet.
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LearningPlannerForm = ({
    spec,
    learningPlan,
    pdfResources,
    openPdfViewer,
    onOpenPdfLinkPicker,
    onUnlinkPdfResource,
    onAddSkillTreePathPlan,
    onUpdateSkillTreePathPlan,
    onToggleSkillAreaInPath,
    onDeleteSkillTreePathPlan,
    onAddLearningResource,
    onLearningPlanFieldChange,
    onDeleteLearningResource,
}: {
    spec: CoreSkill,
    learningPlan: LearningPlan,
    pdfResources: any[],
    openPdfViewer: (resource: any) => void,
    onOpenPdfLinkPicker: (specializationId: string, target: 'book' | 'path', resourceIndex?: number, pathId?: string) => void,
    onUnlinkPdfResource: (specializationId: string, target: 'book' | 'path', resourceIndex?: number, pathId?: string) => void,
    onAddSkillTreePathPlan: (specId: string, spec: CoreSkill) => void,
    onUpdateSkillTreePathPlan: (specId: string, pathId: string, updates: Partial<SkillTreePathPlan>) => void,
    onToggleSkillAreaInPath: (specId: string, pathId: string, areaId: string) => void,
    onDeleteSkillTreePathPlan: (specId: string, pathId: string) => void,
    onAddLearningResource: (specId: string, type: 'audio' | 'book') => void,
    onLearningPlanFieldChange: (specializationId: string, type: 'audio' | 'book', index: number, field: string, value: any) => void,
    onDeleteLearningResource: (specId: string, type: 'audio' | 'book', index: number) => void,
}) => {
    const completedPages = spec.skillAreas.reduce(
        (sum, area) => sum + area.microSkills.reduce((inner, micro) => inner + (micro.completedPages || 0), 0),
        0
    );
    const completedHours = spec.skillAreas.reduce(
        (sum, area) => sum + area.microSkills.reduce((inner, micro) => inner + (micro.completedHours || 0), 0),
        0
    );

    return (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h4 className="text-base font-semibold text-foreground">Books</h4>
                        <p className="text-sm text-muted-foreground">Track reading material and linked PDF cards.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => onAddLearningResource(spec.id, 'book')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add
                    </Button>
                </div>
                <div className="space-y-3">
                    {(learningPlan.bookWebpageResources || []).length > 0 ? (
                        (learningPlan.bookWebpageResources || []).map((resource, index) => {
                            const progressPages = resource.totalPages ? Math.min(completedPages, resource.totalPages) : completedPages;
                            const progressPercent = resource.totalPages ? Math.min(100, Math.round((progressPages / resource.totalPages) * 100)) : 0;
                            const linkedPdf = pdfResources.find((item) => item.id === resource.linkedPdfResourceId);

                            return (
                                <div key={resource.id} className="rounded-2xl border border-border/60 bg-background/30 p-4">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={resource.name}
                                            onChange={(e) => onLearningPlanFieldChange(spec.id, 'book', index, 'name', e.target.value)}
                                            placeholder="Book or webpage name"
                                            className="font-semibold"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-destructive"
                                            onClick={() => onDeleteLearningResource(spec.id, 'book', index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                            <span>Progress</span>
                                            <span>{progressPages}/{resource.totalPages || 0} pages</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-muted">
                                            <div className="h-2 rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenPdfLinkPicker(spec.id, 'book', index)}>
                                            <Search className="mr-2 h-3.5 w-3.5" />
                                            Link PDF
                                        </Button>
                                        {linkedPdf ? (
                                            <>
                                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openPdfViewer(linkedPdf)}>
                                                    <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                                                    {linkedPdf.name}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() => onUnlinkPdfResource(spec.id, 'book', index)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                    <Input className="mt-3" value={resource.author} onChange={(e) => onLearningPlanFieldChange(spec.id, 'book', index, 'author', e.target.value)} placeholder="Author" />
                                    <Input
                                        className="mt-3"
                                        type="number"
                                        value={resource.totalPages || ''}
                                        onChange={(e) => onLearningPlanFieldChange(spec.id, 'book', index, 'totalPages', e.target.value === '' ? null : Number(e.target.value))}
                                        placeholder="Total pages"
                                    />
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <Input type="date" value={resource.startDate || ''} onChange={(e) => onLearningPlanFieldChange(spec.id, 'book', index, 'startDate', e.target.value || null)} />
                                        <Input type="date" value={resource.completionDate || ''} onChange={(e) => onLearningPlanFieldChange(spec.id, 'book', index, 'completionDate', e.target.value || null)} />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/50 bg-background/20 px-4 py-6 text-sm text-muted-foreground">
                            No books or webpages added yet.
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h4 className="text-base font-semibold text-foreground">Audio Video</h4>
                        <p className="text-sm text-muted-foreground">Track courses, playlists, and guided material.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => onAddLearningResource(spec.id, 'audio')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add
                    </Button>
                </div>
                <div className="space-y-3">
                    {(learningPlan.audioVideoResources || []).length > 0 ? (
                        (learningPlan.audioVideoResources || []).map((resource, index) => {
                            const progressHours = resource.totalHours ? Math.min(completedHours, resource.totalHours) : completedHours;
                            const progressPercent = resource.totalHours ? Math.min(100, Math.round((progressHours / resource.totalHours) * 100)) : 0;

                            return (
                                <div key={resource.id} className="rounded-2xl border border-border/60 bg-background/30 p-4">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={resource.name}
                                            onChange={(e) => onLearningPlanFieldChange(spec.id, 'audio', index, 'name', e.target.value)}
                                            placeholder="Course or playlist name"
                                            className="font-semibold"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-destructive"
                                            onClick={() => onDeleteLearningResource(spec.id, 'audio', index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                            <span>Progress</span>
                                            <span>{progressHours}/{resource.totalHours || 0} hours</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-muted">
                                            <div className="h-2 rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                    </div>
                                    <Input className="mt-3" value={resource.tutor} onChange={(e) => onLearningPlanFieldChange(spec.id, 'audio', index, 'tutor', e.target.value)} placeholder="Tutor / creator" />
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <Input type="number" value={resource.totalItems || ''} onChange={(e) => onLearningPlanFieldChange(spec.id, 'audio', index, 'totalItems', e.target.value === '' ? null : Number(e.target.value))} placeholder="Total items" />
                                        <Input type="number" value={resource.totalHours || ''} onChange={(e) => onLearningPlanFieldChange(spec.id, 'audio', index, 'totalHours', e.target.value === '' ? null : Number(e.target.value))} placeholder="Total hours" />
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <Input type="date" value={resource.startDate || ''} onChange={(e) => onLearningPlanFieldChange(spec.id, 'audio', index, 'startDate', e.target.value || null)} />
                                        <Input type="date" value={resource.completionDate || ''} onChange={(e) => onLearningPlanFieldChange(spec.id, 'audio', index, 'completionDate', e.target.value || null)} />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/50 bg-background/20 px-4 py-6 text-sm text-muted-foreground">
                            No audio/video resources yet.
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h4 className="text-base font-semibold text-foreground">Skill Tree Path</h4>
                        <p className="text-sm text-muted-foreground">Create custom paths from skill areas and track completion velocity.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => onAddSkillTreePathPlan(spec.id, spec)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Path
                    </Button>
                </div>
                <div className="space-y-3">
                    {(learningPlan.skillTreePaths || []).length > 0 ? (
                        (learningPlan.skillTreePaths || []).map((path) => {
                            const selectedAreas = spec.skillAreas.filter((area) => (path.skillAreaIds || []).includes(area.id));
                            const totalMicroSkills = selectedAreas.reduce((sum, area) => sum + area.microSkills.length, 0);
                            const completedMicroSkills = selectedAreas.reduce(
                                (sum, area) => sum + area.microSkills.filter((micro) => !!micro.isReadyForRepetition || (micro.completedItems || 0) > 0 || (micro.completedHours || 0) > 0 || (micro.completedPages || 0) > 0).length,
                                0
                            );
                            const targetCount = path.targetMicroSkills ?? totalMicroSkills;
                            const remainingCount = Math.max(0, (targetCount || 0) - Math.min(completedMicroSkills, targetCount || completedMicroSkills));
                            const pathPercent = targetCount && targetCount > 0 ? Math.min(100, Math.round((Math.min(completedMicroSkills, targetCount) / targetCount) * 100)) : 0;
                            const linkedPdf = pdfResources.find((item) => item.id === path.linkedPdfResourceId);

                            return (
                                <div key={path.id} className="rounded-2xl border border-border/60 bg-background/30 p-4">
                                    <div className="flex items-center gap-2">
                                        <Input value={path.name} onChange={(e) => onUpdateSkillTreePathPlan(spec.id, path.id, { name: e.target.value })} placeholder="Path name" className="font-semibold" />
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => onDeleteSkillTreePathPlan(spec.id, path.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                            <span>Progress</span>
                                            <span>{Math.min(completedMicroSkills, targetCount || completedMicroSkills)}/{targetCount || 0} completed</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-muted">
                                            <div className="h-2 rounded-full bg-primary" style={{ width: `${pathPercent}%` }} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenPdfLinkPicker(spec.id, 'path', undefined, path.id)}>
                                            <Search className="mr-2 h-3.5 w-3.5" />
                                            Link PDF
                                        </Button>
                                        {linkedPdf ? (
                                            <>
                                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openPdfViewer(linkedPdf)}>
                                                    <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                                                    {linkedPdf.name}
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onUnlinkPdfResource(spec.id, 'path', undefined, path.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                    <Input className="mt-3" type="number" value={path.targetMicroSkills ?? ''} onChange={(e) => onUpdateSkillTreePathPlan(spec.id, path.id, { targetMicroSkills: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Target micro-skills" />
                                    <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                        Remaining: {remainingCount}
                                    </div>
                                    <Input className="mt-3" type="date" value={path.completionDate || ''} onChange={(e) => onUpdateSkillTreePathPlan(spec.id, path.id, { completionDate: e.target.value || null })} />
                                    <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                                        <div className="mb-2 text-xs font-medium text-muted-foreground">Skill Areas In This Path</div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {spec.skillAreas.map((area) => (
                                                <label key={area.id} className="flex items-center gap-2 text-xs">
                                                    <Checkbox checked={(path.skillAreaIds || []).includes(area.id)} onCheckedChange={() => onToggleSkillAreaInPath(spec.id, path.id, area.id)} />
                                                    <span className="truncate">{area.name}</span>
                                                    <span className="text-muted-foreground">({area.microSkills.length})</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/50 bg-background/20 px-4 py-6 text-sm text-muted-foreground">
                            No custom paths yet. Create a path from skill areas to start planning progression.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

function StrategicPlanningPageContent() {
  const router = useRouter();
  const { settings } = useAuth();
  const [activeTab, setActiveTab] = useState('planning');

  const allTabs = [
    { value: 'planning', label: 'Planning' },
    { value: 'productization', label: 'Productization' },
    { value: 'offerization', label: 'Offerization' },
    { value: 'offers', label: 'Offers' },
    { value: 'matrix', label: 'Matrix' },
  ];
  const tabs = allTabs;
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && tabs.some(t => t.value === tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('planning');
    }
  }, [tabs]);

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
            <TabsList className={cn("grid w-full grid-cols-2 md:grid-cols-5")}>
            {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="planning" className="mt-6">
          <PlanningContent />
        </TabsContent>
        <TabsContent value="offerization" className="mt-6">
          <OfferizationContent />
        </TabsContent>
          <TabsContent value="productization" className="mt-6">
            <ProductizationContent />
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

function OffersContent() {
  const { coreSkills, offerizationPlans, projects } = useAuth();

  const specializations = useMemo(() => {
    return coreSkills.filter((skill) => skill.type === 'Specialization');
  }, [coreSkills]);

  const offerRows = useMemo(() => {
    return specializations.flatMap((spec) => {
      const plan = offerizationPlans[spec.id] || {};
      return (plan.offers || []).map((offer) => ({
        spec,
        offer,
        releases: (plan.releases || []).filter((release) => release.name === offer.name),
        projectMatch: projects.find((project) => project.name === offer.name) || null,
      }));
    });
  }, [specializations, offerizationPlans, projects]);

  const offerCount = offerRows.length;
  const specializationCount = new Set(offerRows.map((row) => row.spec.id)).size;
  const releasedCount = offerRows.filter((row) => row.releases.length > 0).length;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <MessageCircle className="h-6 w-6 text-primary" />
            Offers
          </CardTitle>
          <CardDescription>
            Consolidated view of offers designed inside offerization plans.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Offers</div>
            <div className="mt-2 text-3xl font-semibold">{offerCount}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Specializations</div>
            <div className="mt-2 text-3xl font-semibold">{specializationCount}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Released / Planned</div>
            <div className="mt-2 text-3xl font-semibold">{releasedCount}/{offerCount}</div>
          </div>
        </CardContent>
      </Card>

      {offerRows.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {offerRows.map(({ spec, offer, releases, projectMatch }) => (
            <Card key={`${spec.id}-${offer.id}`} className="rounded-2xl border-border/60 bg-card/75">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{offer.name}</CardTitle>
                    <CardDescription>{spec.name}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {projectMatch ? <Badge variant="outline">Project linked</Badge> : null}
                    {releases.length > 0 ? <Badge variant="secondary">Release planned</Badge> : <Badge variant="secondary">Concept</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Outcome</h4>
                  <p className="text-sm text-muted-foreground">{offer.outcome || 'No outcome defined yet.'}</p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Audience</h4>
                  <p className="text-sm text-muted-foreground">{offer.audience || 'No audience defined yet.'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</div>
                    <div className="mt-1 text-sm font-medium">{offer.timeline || 'Not set'}</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Price</div>
                    <div className="mt-1 text-sm font-medium">{offer.price || 'Not set'}</div>
                  </div>
                </div>
                {offer.deliverables ? (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Deliverables</h4>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{offer.deliverables}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No offers found. Create offers in the `Offerization` tab and they will appear here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VisualizeProgressContent() {
  const { coreSkills, offerizationPlans } = useAuth();

  const specializations = useMemo(() => {
    return coreSkills.filter((skill) => skill.type === 'Specialization');
  }, [coreSkills]);

  const progressRows = useMemo(() => {
    return specializations.map((spec) => {
      const plan = offerizationPlans[spec.id] || {};
      const offerTypes = plan.offerTypes || [];
      const offers = plan.offers || [];
      const releases = plan.releases || [];
      const learningPlan = plan.learningPlan || {};
      const totalMicroSkills = spec.skillAreas.reduce((sum, area) => sum + area.microSkills.length, 0);
      const completedMicroSkills = spec.skillAreas.reduce(
        (sum, area) => sum + area.microSkills.filter((micro) => micro.completed).length,
        0
      );
      const learningResourceCount =
        (learningPlan.audioVideoResources || []).length +
        (learningPlan.bookWebpageResources || []).length +
        (learningPlan.skillTreePaths || []).length;
      const portfolioProjects = releases.filter((release) => release.addToPortfolio).length;

      const checkpoints = [
        offerTypes.length > 0,
        !!plan.gapAnalysis,
        learningResourceCount > 0,
        releases.length > 0,
        offers.length > 0,
      ];
      const completionPercent = Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
      const microSkillPercent = totalMicroSkills > 0 ? Math.round((completedMicroSkills / totalMicroSkills) * 100) : 0;

      return {
        spec,
        offerTypes: offerTypes.length,
        offers: offers.length,
        releases: releases.length,
        learningResourceCount,
        portfolioProjects,
        totalMicroSkills,
        completedMicroSkills,
        completionPercent,
        microSkillPercent,
      };
    });
  }, [specializations, offerizationPlans]);

  const totals = useMemo(() => {
    return progressRows.reduce(
      (acc, row) => {
        acc.specializations += 1;
        acc.offers += row.offers;
        acc.projects += row.releases;
        acc.portfolioProjects += row.portfolioProjects;
        acc.completedMicroSkills += row.completedMicroSkills;
        acc.totalMicroSkills += row.totalMicroSkills;
        return acc;
      },
      {
        specializations: 0,
        offers: 0,
        projects: 0,
        portfolioProjects: 0,
        completedMicroSkills: 0,
        totalMicroSkills: 0,
      }
    );
  }, [progressRows]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Activity className="h-6 w-6 text-primary" />
            Visualize Progress
          </CardTitle>
          <CardDescription>
            Track strategy progress across skill development, offers, projects, and portfolio readiness.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Specializations</div>
            <div className="mt-2 text-3xl font-semibold">{totals.specializations}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Offers</div>
            <div className="mt-2 text-3xl font-semibold">{totals.offers}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Projects</div>
            <div className="mt-2 text-3xl font-semibold">{totals.projects}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Portfolio Ready</div>
            <div className="mt-2 text-3xl font-semibold">{totals.portfolioProjects}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Micro-Skills Done</div>
            <div className="mt-2 text-3xl font-semibold">
              {totals.completedMicroSkills}/{totals.totalMicroSkills}
            </div>
          </div>
        </CardContent>
      </Card>

      {progressRows.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {progressRows.map((row) => (
            <Card key={row.spec.id} className="rounded-2xl border-border/60 bg-card/75">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{row.spec.name}</CardTitle>
                    <CardDescription>
                      {row.offerTypes} offer type{row.offerTypes === 1 ? '' : 's'} · {row.learningResourceCount} learning item{row.learningResourceCount === 1 ? '' : 's'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{row.completionPercent}% complete</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Strategy Completion</span>
                    <span className="text-muted-foreground">{row.completionPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${row.completionPercent}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Micro-Skill Completion</span>
                    <span className="text-muted-foreground">{row.completedMicroSkills}/{row.totalMicroSkills}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${row.microSkillPercent}%` }} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Offers</div>
                    <div className="mt-1 text-sm font-medium">{row.offers}</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Projects</div>
                    <div className="mt-1 text-sm font-medium">{row.releases}</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Portfolio</div>
                    <div className="mt-1 text-sm font-medium">{row.portfolioProjects}</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Learning</div>
                    <div className="mt-1 text-sm font-medium">{row.learningResourceCount}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No specialization progress found yet. Start building plans in `Offerization` to visualize progress here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MatrixContent() {
  const { coreSkills, offerizationPlans, projects } = useAuth();

  const specializations = useMemo(() => {
    return coreSkills.filter((skill) => skill.type === 'Specialization');
  }, [coreSkills]);

  const matrixRows = useMemo(() => {
    return specializations.map((spec) => {
      const plan = offerizationPlans[spec.id] || {};
      const releases = plan.releases || [];
      const offers = plan.offers || [];
      const matchingProjects = projects.filter((project) =>
        releases.some((release) => release.name === project.name) ||
        offers.some((offer) => offer.name === project.name)
      );
      return {
        spec,
        offerTypes: plan.offerTypes || [],
        gapTypes: plan.gapAnalysis?.gapTypes || [],
        outcomeGoal: plan.gapAnalysis?.outcomeGoal || '',
        releases,
        offers,
        matchingProjects,
      };
    }).filter((row) =>
      row.offerTypes.length > 0 ||
      row.gapTypes.length > 0 ||
      row.releases.length > 0 ||
      row.offers.length > 0 ||
      row.matchingProjects.length > 0
    );
  }, [specializations, offerizationPlans, projects]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <DraftingCompass className="h-6 w-6 text-primary" />
            Strategy Matrix
          </CardTitle>
          <CardDescription>
            Cross-view of specialization, offer type, gap, offer, release, and project alignment.
          </CardDescription>
        </CardHeader>
      </Card>

      {matrixRows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/75">
          <div className="grid grid-cols-[220px_220px_220px_240px_220px_220px] gap-0 border-b border-border/60 bg-muted/20 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="px-4 py-3">Specialization</div>
            <div className="px-4 py-3">Offer Types</div>
            <div className="px-4 py-3">Gap Types</div>
            <div className="px-4 py-3">Outcome Goal</div>
            <div className="px-4 py-3">Offers / Releases</div>
            <div className="px-4 py-3">Projects</div>
          </div>
          {matrixRows.map((row) => (
            <div
              key={row.spec.id}
              className="grid grid-cols-[220px_220px_220px_240px_220px_220px] gap-0 border-b border-border/40 text-sm last:border-b-0"
            >
              <div className="px-4 py-4 font-medium">{row.spec.name}</div>
              <div className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {row.offerTypes.length > 0 ? row.offerTypes.map((type) => (
                    <Badge key={type} variant="secondary">{type}</Badge>
                  )) : <span className="text-muted-foreground">None</span>}
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {row.gapTypes.length > 0 ? row.gapTypes.map((type) => (
                    <Badge key={type} variant="outline">{type}</Badge>
                  )) : <span className="text-muted-foreground">None</span>}
                </div>
              </div>
              <div className="px-4 py-4 text-muted-foreground">
                {row.outcomeGoal || 'No outcome goal defined.'}
              </div>
              <div className="px-4 py-4 space-y-2">
                {row.offers.length > 0 ? row.offers.map((offer) => (
                  <div key={offer.id} className="rounded-lg border border-border/40 bg-background/30 px-3 py-2">
                    <div className="font-medium">{offer.name}</div>
                    <div className="text-xs text-muted-foreground">{offer.price || 'No price'}</div>
                  </div>
                )) : null}
                {row.releases.length > 0 ? row.releases.map((release) => (
                  <div key={release.id} className="rounded-lg border border-border/40 bg-background/30 px-3 py-2">
                    <div className="font-medium">{release.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {release.launchDate ? format(parseISO(release.launchDate), 'PPP') : 'No launch date'}
                    </div>
                  </div>
                )) : row.offers.length === 0 ? <span className="text-muted-foreground">None</span> : null}
              </div>
              <div className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {row.matchingProjects.length > 0 ? row.matchingProjects.map((project) => (
                    <Badge key={project.id} variant="secondary">{project.name}</Badge>
                  )) : <span className="text-muted-foreground">No linked projects</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No strategy matrix data yet. Fill the `Offerization` tab first.
          </CardContent>
        </Card>
      )}
    </div>
  );
}




