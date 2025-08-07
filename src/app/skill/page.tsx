

"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, Edit, Save, X, BrainCircuit, Blocks, Sprout, Briefcase, Plus, Building, Unlink, BookCopy, FolderOpen, GitMerge, Workflow, Lightbulb, Flashlight, Frame, Activity, ArrowLeft, Bolt, Flag, Focus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import type { SkillDomain, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition, Project, Feature, Company, Position, WorkProject, ProjectSkillLink } from '@/types/workout';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { MindMapViewer } from '@/components/MindMapViewer';
import { IntentionDetailModal } from '@/components/IntentionDetailModal';
import { SkillLibrary } from '@/components/SkillLibrary';

function SkillPageContent() {
  const { toast } = useAuth();
  const { 
    skillDomains, setSkillDomains, 
    coreSkills, setCoreSkills, 
    projects, setProjects,
    companies, setCompanies,
    positions, setPositions,
    microSkillMap,
    upskillDefinitions,
    deepWorkDefinitions,
    openPistonsFor,
    handleUpdateSkillArea,
    handleDeleteSkillArea,
    handleAddMicroSkill,
    handleUpdateMicroSkill,
    handleDeleteMicroSkill,
    expandedItems,
    handleExpansionChange,
    selectedDomainId, setSelectedDomainId,
    selectedSkillId, setSelectedSkillId,
    selectedProjectId, setSelectedProjectId,
    selectedCompanyId, setSelectedCompanyId,
  } = useAuth();
  
  const router = useRouter();

  const [newDomainName, setNewDomainName] = useState('');
  
  const [editingDomain, setEditingDomain] = useState<SkillDomain | null>(null);
  const [editingSkill, setEditingSkill] = useState<CoreSkill | null>(null);

  const [newSpecializationNames, setNewSpecializationNames] = useState<Record<string, string>>({});
  const [newSkillAreaNames, setNewSkillAreaNames] = useState<Record<string, string>>({});
  const [newMicroSkillNames, setNewMicroSkillNames] = useState<Record<string, string>>({});
  
  const [editingArea, setEditingArea] = useState<{skillId: string, area: SkillArea} | null>(null);
  const [addingMicroSkillTo, setAddingMicroSkillTo] = useState<string | null>(null);
  const [newMicroSkillName, setNewMicroSkillName] = useState('');
  const [editingMicroSkill, setEditingMicroSkill] = useState<{skillId: string, areaId: string, microSkill: MicroSkill} | null>(null);
  
  // Project state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newFeatureNames, setNewFeatureNames] = useState<Record<string, string>>({});
  
  const [linkingSkillsForFeature, setLinkingSkillsForFeature] = useState<Feature | null>(null);

  // Professional Experience state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [newPositionTitle, setNewPositionTitle] = useState<Record<string, string>>({});
  const [editingWorkProject, setEditingWorkProject] = useState<{ positionId: string; project: Partial<WorkProject> } | null>(null);

  // State for the modal
  const [selectedIntention, setSelectedIntention] = useState<ExerciseDefinition | null>(null);


  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    const newDomain: SkillDomain = { id: `d_${Date.now()}`, name: newDomainName.trim() };
    const foundationSkill: CoreSkill = { id: `cs_${Date.now()}_f`, domainId: newDomain.id, name: 'Foundation', type: 'Foundation', skillAreas: [] };
    const professionalismSkill: CoreSkill = { id: `cs_${Date.now()}_p`, domainId: newDomain.id, name: 'Professionalism', type: 'Professionalism', skillAreas: [] };
    
    setSkillDomains(prev => [...prev, newDomain]);
    setCoreSkills(prev => [...prev, foundationSkill, professionalismSkill]);
    setNewDomainName('');
    setSelectedDomainId(newDomain.id);
    setSelectedSkillId(foundationSkill.id);
    setSelectedProjectId(null);
    setSelectedCompanyId(null);
    toast({ title: "Domain Created", description: `"${newDomain.name}" was added to your library.` });
  };

  const handleDeleteDomain = (domainId: string) => {
    setSkillDomains(prev => prev.filter(d => d.id !== domainId));
    setCoreSkills(prev => prev.filter(s => s.domainId !== domainId));
    setProjects(prev => prev.filter(p => p.domainId !== domainId));
    if (selectedDomainId === domainId) {
        setSelectedDomainId(null);
        setSelectedSkillId(null);
        setSelectedProjectId(null);
        setSelectedCompanyId(null);
    }
  };

  const handleAddSpecialization = (domainId: string) => {
    const name = newSpecializationNames[domainId]?.trim();
    if (!name) return;
    const newSkill: CoreSkill = { id: `cs_${Date.now()}_s`, domainId, name, type: 'Specialization', skillAreas: [] };
    setCoreSkills(prev => [...prev, newSkill]);
    setNewSpecializationNames(prev => ({ ...prev, [domainId]: '' }));
    setSelectedSkillId(newSkill.id);
    toast({ title: "Specialization Added", description: `"${newSkill.name}" was added.` });
  };
  
  const handleDeleteCoreSkill = (skillId: string) => {
    setCoreSkills(prev => prev.filter(s => s.id !== skillId));
    if (selectedSkillId === skillId) {
        setSelectedSkillId(null);
    }
  };

  const handleAddSkillArea = (skillId: string) => {
    const name = newSkillAreaNames[skillId]?.trim();
    if (!name) return;
    const newArea: SkillArea = { id: `sa_${Date.now()}`, name, purpose: '', microSkills: [] };
    setCoreSkills(prev => prev.map(s => s.id === skillId ? { ...s, skillAreas: [...s.skillAreas, newArea] } : s));
    setNewSkillAreaNames(prev => ({...prev, [skillId]: ''}));
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !selectedDomainId) return;
    const newProject: Project = { id: `proj_${Date.now()}`, name: newProjectName.trim(), domainId: selectedDomainId, features: [] };
    setProjects(prev => [...prev, newProject]);
    setNewProjectName('');
    setSelectedProjectId(newProject.id);
  };
  
  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (selectedProjectId === projectId) setSelectedProjectId(null);
  };

  const handleAddFeature = (projectId: string) => {
    const name = newFeatureNames[projectId]?.trim();
    if (!name) return;
    const newFeature: Feature = { id: `feat_${Date.now()}`, name, linkedSkills: [] };
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, features: [...p.features, newFeature] } : p));
    setNewFeatureNames(prev => ({ ...prev, [projectId]: '' }));
  };

  const handleDeleteFeature = (projectId: string, featureId: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            return { ...p, features: p.features.filter(f => f.id !== featureId) };
        }
        return p;
    }));
  };
  
  const handleToggleSkillLink = (feature: Feature, microSkillId: string) => {
    const selectedProject = projects.find(p => p.features.some(f => f.id === feature.id));
    if (!selectedProject) return;
    
    const isLinked = feature.linkedSkills.some(l => l.microSkillId === microSkillId);
    let updatedSkills;
    if (isLinked) {
        updatedSkills = feature.linkedSkills.filter(l => l.microSkillId !== microSkillId);
    } else {
        updatedSkills = [...feature.linkedSkills, { featureId: feature.id, microSkillId }];
    }
    
    setProjects(prev => prev.map(p => {
        if (p.id === selectedProject.id) {
            return { ...p, features: p.features.map(f => f.id === feature.id ? { ...f, linkedSkills: updatedSkills } : f) };
        }
        return p;
    }));
  };
  
  const handleUnlinkSkill = (feature: Feature, link: ProjectSkillLink) => {
    const selectedProject = projects.find(p => p.features.some(f => f.id === feature.id));
    if (!selectedProject) return;
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        const newFeatures = p.features.map(f => {
          if (f.id === feature.id) {
            const newLinkedSkills = f.linkedSkills.filter(l => l.microSkillId !== link.microSkillId);
            return { ...f, linkedSkills: newLinkedSkills };
          }
          return f;
        });
        return { ...p, features: newFeatures };
      }
      return p;
    }));
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    const newCompany: Company = { id: `comp_${Date.now()}`, name: newCompanyName.trim() };
    setCompanies(prev => [...prev, newCompany]);
    setNewCompanyName('');
  };

  const handleDeleteCompany = (companyId: string) => {
    setCompanies(prev => prev.filter(c => c.id !== companyId));
    setPositions(prev => prev.filter(p => p.companyId !== companyId));
    if (selectedCompanyId === companyId) setSelectedCompanyId(null);
  };
  
  const handleAddPosition = (companyId: string) => {
    const title = newPositionTitle[companyId]?.trim();
    if (!title) return;
    const newPosition: Position = { id: `pos_${Date.now()}`, companyId, title, projects: [] };
    setPositions(prev => [...prev, newPosition]);
    setNewPositionTitle(prev => ({ ...prev, [companyId]: '' }));
  };

  const handleDeletePosition = (positionId: string) => {
    setPositions(prev => prev.filter(p => p.id !== positionId));
    if (editingPosition?.id === positionId) setEditingPosition(null);
  };

  const handleSaveWorkProject = () => {
    if (!editingWorkProject) return;
    const { positionId, project } = editingWorkProject;
    if (!project.name?.trim() || !project.linkedSpecializationId) {
      toast({ title: "Error", description: "Project name and linked specialization are required.", variant: "destructive" });
      return;
    }
    setPositions(prev => prev.map(p => {
      if (p.id === positionId) {
        const existingProjectIndex = p.projects.findIndex(wp => wp.id === project.id);
        const finalProject: WorkProject = {
          id: project.id || `wproj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: project.name,
          description: project.description || '',
          linkedSpecializationId: project.linkedSpecializationId,
        };
        if (existingProjectIndex > -1) {
          p.projects[existingProjectIndex] = finalProject;
        } else {
          p.projects.push(finalProject);
        }
      }
      return p;
    }));
    setEditingWorkProject(null);
  };
  
  const handleDeleteWorkProject = (positionId: string, projectId: string) => {
    setPositions(prev => prev.map(p => {
        if (p.id === positionId) {
            return { ...p, projects: p.projects.filter(wp => wp.id !== projectId) };
        }
        return p;
    }));
  };

  const selectedCoreSkill = useMemo(() => coreSkills.find(s => s.id === selectedSkillId), [coreSkills, selectedSkillId]);
  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const selectedCompanyPositions = useMemo(() => positions.filter(p => p.companyId === selectedCompanyId), [positions, selectedCompanyId]);

  const coreSkillsInDomain = useMemo(() => {
    if (!selectedDomainId) return [];
    return coreSkills.filter(cs => cs.domainId === selectedDomainId);
  }, [coreSkills, selectedDomainId]);
  
  const handleSelectDomain = (domainId: string) => {
      setSelectedDomainId(domainId);
      setSelectedSkillId(null);
      setSelectedProjectId(null);
      setSelectedCompanyId(null);
  };

  const handleSelectCoreSkill = (skillId: string) => {
    setSelectedSkillId(skillId);
    setSelectedProjectId(null);
    setSelectedCompanyId(null);
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSkillId(null);
    setSelectedCompanyId(null);
  }
  
  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedDomainId(null);
    setSelectedSkillId(null);
    setSelectedProjectId(null);
  };

  const renderCoreSkillPillar = useCallback((skill: CoreSkill) => {
    let icon;
    switch (skill.type) {
        case 'Foundation': icon = <Blocks className="h-4 w-4"/>; break;
        case 'Professionalism': icon = <Sprout className="h-4 w-4"/>; break;
        case 'Specialization': icon = <BrainCircuit className="h-4 w-4"/>; break;
    }
    
    return (
        <div key={skill.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-muted">
            <button className="flex items-center gap-2 flex-grow min-w-0" onClick={() => handleSelectCoreSkill(skill.id)}>
                {icon}
                <span className={`text-sm ${selectedSkillId === skill.id ? 'font-semibold text-primary' : ''}`}>{skill.name}</span>
            </button>
            {skill.type === 'Specialization' && (
                <div className="flex items-center opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSkill(skill)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete the "{skill.name}" specialization and all its contents.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCoreSkill(skill.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </div>
    )
  }, [selectedSkillId, handleDeleteCoreSkill]);

  const specializationSkills = useMemo(() => {
    return coreSkills.filter(skill => skill.type === 'Specialization');
  }, [coreSkills]);

  const linkedTasksByCoreSkill = useMemo(() => {
    if (!selectedProject) return new Map();

    const intentionsAndCuriosities = [...deepWorkDefinitions, ...upskillDefinitions];
    const linkedItems = intentionsAndCuriosities.filter(item => item.linkedProjectId === selectedProject.id);

    // Group by Core Skill, then Micro Skill
    const grouped = new Map<string, { coreSkillName: string, microSkills: Map<string, ExerciseDefinition[]> }>();

    linkedItems.forEach(item => {
        const microSkillInfo = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === item.category);
        if (microSkillInfo) {
            const { coreSkillName, microSkillName } = microSkillInfo;

            if (!grouped.has(coreSkillName)) {
                grouped.set(coreSkillName, { coreSkillName, microSkills: new Map() });
            }

            const coreSkillGroup = grouped.get(coreSkillName)!;
            if (!coreSkillGroup.microSkills.has(microSkillName)) {
                coreSkillGroup.microSkills.set(microSkillName, []);
            }
            coreSkillGroup.microSkills.get(microSkillName)!.push(item);
        }
    });

    return grouped;
  }, [selectedProject, deepWorkDefinitions, upskillDefinitions, microSkillMap]);

  return (
    <>
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill &amp; Experience Library</CardTitle>
              <CardDescription>Define domains, skills, projects, and work history.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full" value={expandedItems} onValueChange={handleExpansionChange}>
                <AccordionItem value="skills-domains">
                  <AccordionTrigger>Skills &amp; Projects</AccordionTrigger>
                  <AccordionContent>
                      <form onSubmit={handleAddDomain} className="flex gap-2 my-2">
                        <Input value={newDomainName} onChange={e => setNewDomainName(e.target.value)} placeholder="New Domain" />
                        <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
                      </form>
                      <Accordion type="single" collapsible className="w-full" value={selectedDomainId || ''} onValueChange={handleSelectDomain}>
                        {skillDomains.map(domain => {
                            const domainCoreSkills = coreSkills.filter(s => s.domainId === domain.id);
                            const domainProjects = projects.filter(p => p.domainId === domain.id);
                            return (
                                <AccordionItem value={domain.id} key={domain.id}>
                                    <div className="flex items-center justify-between w-full group">
                                        <AccordionTrigger className="flex-grow">
                                          <span>{domain.name}</span>
                                        </AccordionTrigger>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 ml-2">
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingDomain(domain); }}><Edit className="h-4 w-4"/></Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the "{domain.name}" domain and all its contents.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteDomain(domain.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                    </div>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-xs text-muted-foreground px-2">Core Pillars</h4>
                                            {domainCoreSkills.filter(s => s.type !== 'Specialization').map(renderCoreSkillPillar)}
                                            <h4 className="font-semibold text-xs text-muted-foreground px-2 pt-2">Specializations</h4>
                                            {domainCoreSkills.filter(s => s.type === 'Specialization').map(renderCoreSkillPillar)}
                                            <div className="flex gap-2 pt-2">
                                              <Input placeholder="New Specialization" value={newSpecializationNames[domain.id] || ''} onChange={e => setNewSpecializationNames(prev => ({...prev, [domain.id]: e.target.value}))}/>
                                              <Button size="icon" onClick={() => handleAddSpecialization(domain.id)}><PlusCircle className="h-4 w-4"/></Button>
                                            </div>
                                            <h4 className="font-semibold text-xs text-muted-foreground px-2 pt-4">Projects</h4>
                                            {domainProjects.map(p => (
                                                <div key={p.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                                  <button className="flex items-center gap-2 flex-grow min-w-0" onClick={() => handleSelectProject(p.id)}>
                                                    <Briefcase className="h-4 w-4" />
                                                    <span className={`text-sm ${selectedProjectId === p.id ? 'font-semibold text-primary' : ''}`}>{p.name}</span>
                                                  </button>
                                                  <div className="flex items-center opacity-0 group-hover:opacity-100">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingProject(p)}><Edit className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProject(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                  </div>
                                                </div>
                                            ))}
                                             <div className="flex gap-2 pt-2">
                                              <Input placeholder="New Project" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}/>
                                              <Button size="icon" onClick={handleAddProject}><PlusCircle className="h-4 w-4"/></Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                      </Accordion>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="professional-experience">
                    <AccordionTrigger>Professional Experience</AccordionTrigger>
                    <AccordionContent>
                        <form onSubmit={handleAddCompany} className="flex gap-2 my-2">
                            <Input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="New Company"/>
                            <Button size="icon" type="submit"><PlusCircle className="h-4 w-4"/></Button>
                        </form>
                        <div className="space-y-2">
                            {companies.map(company => (
                                <div key={company.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <button className="flex items-center gap-2 flex-grow min-w-0" onClick={() => handleSelectCompany(company.id)}>
                                        <Building className="h-4 w-4" />
                                        <span className={`text-sm ${selectedCompanyId === company.id ? 'font-semibold text-primary' : ''}`}>{company.name}</span>
                                    </button>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCompany(company)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCompany(company.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </aside>
        
        <main className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>{selectedCoreSkill ? `Viewing skill areas for "${selectedCoreSkill.name}"` : selectedProject ? `Viewing linked tasks for "${selectedProject.name}"` : selectedCompanyId ? `Viewing positions for "${companies.find(c => c.id === selectedCompanyId)?.name}"` : 'Select an item from the library.'}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProject ? (
                  <div className="space-y-6">
                    {Array.from(linkedTasksByCoreSkill.entries()).map(([coreSkillName, data]) => (
                      <div key={coreSkillName}>
                        <h3 className="text-lg font-semibold mb-2">{coreSkillName}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Array.from(data.microSkills.entries()).map(([microSkillName, tasks]) => (
                            <Card key={microSkillName}>
                              <CardHeader className="p-3">
                                <CardTitle className="text-base">{microSkillName}</CardTitle>
                              </CardHeader>
                              <CardContent className="p-3 pt-0">
                                <ul className="text-sm space-y-1">
                                  {tasks.map(task => (
                                    <li key={task.id} className="flex items-center gap-2">
                                      {upskillDefinitions.some(d => d.id === task.id) ? (
                                          <Flashlight className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                      ) : (
                                          <Lightbulb className="h-4 w-4 text-green-500 flex-shrink-0" />
                                      )}
                                      <span className="text-muted-foreground truncate" title={task.name}>{task.name}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                    {linkedTasksByCoreSkill.size === 0 && <p className="text-center text-muted-foreground">No Intentions or Curiosities linked to this project yet.</p>}
                  </div>
              ) : selectedCoreSkill ? (
                  <div className="space-y-4">
                      <div className="flex items-center gap-2">
                          <Input value={newSkillAreaNames[selectedSkillId!] || ''} onChange={e => setNewSkillAreaNames(prev => ({...prev, [selectedSkillId!]: e.target.value}))} placeholder="New Skill Area Name" />
                          <Button onClick={() => handleAddSkillArea(selectedSkillId!)}>Add Skill Area</Button>
                      </div>
                       <Accordion type="multiple" className="w-full space-y-2">
                          {selectedCoreSkill.skillAreas.map(area => (
                            <Card key={area.id}>
                              <AccordionItem value={area.id} className="border-b-0">
                                <CardHeader className="p-3">
                                  <div className="flex items-center justify-between w-full">
                                    <AccordionTrigger className="hover:no-underline p-0 flex-grow">
                                      <div className="flex items-center gap-2">
                                        <FolderOpen className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold text-lg">{area.name}</span>
                                      </div>
                                    </AccordionTrigger>
                                    <div className="flex items-center">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingArea({skillId: selectedCoreSkill.id, area}); }}><Edit className="h-4 w-4"/></Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete "{area.name}"?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete the skill area and all its micro-skills.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteSkillArea(selectedCoreSkill.id, area.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                </CardHeader>
                                <AccordionContent className="px-3 pb-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {area.microSkills.map(micro => (
                                      <Card key={micro.id} className="flex flex-col group/item">
                                          <CardHeader className="p-3 flex flex-row items-center justify-between">
                                              <CardTitle className="text-base">{micro.name}</CardTitle>
                                          </CardHeader>
                                      </Card>
                                    ))}
                                     <Card className="flex flex-col items-center justify-center border-dashed min-h-[5rem] hover:border-primary hover:bg-muted/50 transition-colors">
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            handleAddMicroSkill(selectedCoreSkill.id, area.id, newMicroSkillNames[area.id] || '');
                                            setNewMicroSkillNames(prev => ({ ...prev, [area.id]: '' }));
                                        }} className="flex items-center gap-2 mt-2 pt-2 w-full p-4">
                                            <Input
                                                value={newMicroSkillNames[area.id] || ''}
                                                onChange={e => setNewMicroSkillNames(prev => ({...prev, [area.id]: e.target.value}))}
                                                placeholder="Add new micro-skill..."
                                                className="h-8"
                                            />
                                            <Button size="icon" type="submit" className="h-8 w-8 shrink-0">
                                                <PlusCircle className="h-4 w-4" />
                                            </Button>
                                        </form>
                                     </Card>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Card>
                          ))}
                       </Accordion>
                  </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">Select an item to see its breakdown.</div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
       {editingDomain && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingDomain(null)}>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <Card className="w-96">
                    <CardHeader><CardTitle>Rename Domain</CardTitle></CardHeader>
                    <CardContent>
                        <Input value={editingDomain.name} onChange={(e) => setEditingDomain({ ...editingDomain, name: e.target.value })} autoFocus/>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingDomain(null)}>Cancel</Button>
                        <Button onClick={() => { setSkillDomains(prev => prev.map(d => d.id === editingDomain.id ? editingDomain : d)); setEditingDomain(null); }}>Save</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
       )}
       {editingSkill && (
         <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingSkill(null)}>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <Card className="w-96">
                    <CardHeader><CardTitle>Rename Specialization</CardTitle></CardHeader>
                    <CardContent>
                        <Input value={editingSkill.name} onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })} autoFocus/>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingSkill(null)}>Cancel</Button>
                        <Button onClick={() => { setCoreSkills(prev => prev.map(s => s.id === editingSkill.id ? editingSkill : s)); setEditingSkill(null); }}>Save</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
       )}
       {editingArea && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingArea(null)}>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <Card className="w-96">
                    <CardHeader><CardTitle>Edit Skill Area</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="area-name">Name</Label>
                            <Input id="area-name" value={editingArea.area.name} onChange={(e) => setEditingArea(prev => prev ? {...prev, area: {...prev.area, name: e.target.value}} : null)} />
                        </div>
                        <div>
                            <Label htmlFor="area-purpose">Purpose</Label>
                            <Textarea id="area-purpose" value={editingArea.area.purpose} onChange={(e) => setEditingArea(prev => prev ? {...prev, area: {...prev.area, purpose: e.target.value}} : null)} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingArea(null)}>Cancel</Button>
                        <Button onClick={() => { handleUpdateSkillArea(editingArea.skillId, editingArea.area.id, editingArea.area.name, editingArea.area.purpose); setEditingArea(null); }}>Save</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
       )}
       {editingMicroSkill && (
         <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingMicroSkill(null)}>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <Card className="w-96">
                    <CardHeader><CardTitle>Rename Micro-Skill</CardTitle></CardHeader>
                    <CardContent>
                        <Input value={editingMicroSkill.microSkill.name} onChange={(e) => setEditingMicroSkill(prev => prev ? {...prev, microSkill: {...prev.microSkill, name: e.target.value}} : null)} autoFocus/>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingMicroSkill(null)}>Cancel</Button>
                        <Button onClick={() => { handleUpdateMicroSkill(editingMicroSkill.skillId, editingMicroSkill.areaId, editingMicroSkill.microSkill.id, editingMicroSkill.microSkill.name); setEditingMicroSkill(null); }}>Save</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
       )}
        {editingProject && (
         <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingProject(null)}>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <Card className="w-96">
                    <CardHeader><CardTitle>Rename Project</CardTitle></CardHeader>
                    <CardContent>
                        <Input value={editingProject.name} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} autoFocus/>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingProject(null)}>Cancel</Button>
                        <Button onClick={() => { setProjects(prev => prev.map(p => p.id === editingProject.id ? editingProject : p)); setEditingProject(null); }}>Save</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
       )}
       {editingCompany && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingCompany(null)}>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <Card className="w-96">
                    <CardHeader><CardTitle>Rename Company</CardTitle></CardHeader>
                    <CardContent>
                        <Input value={editingCompany.name} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} autoFocus/>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingCompany(null)}>Cancel</Button>
                        <Button onClick={() => { setCompanies(prev => prev.map(c => c.id === editingCompany.id ? editingCompany : c)); setEditingCompany(null); }}>Save</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
       )}
        {editingPosition && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingPosition(null)}>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <Card className="w-96">
                    <CardHeader><CardTitle>Rename Position</CardTitle></CardHeader>
                    <CardContent>
                        <Input value={editingPosition.title} onChange={(e) => setEditingPosition({ ...editingPosition, title: e.target.value })} autoFocus/>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingPosition(null)}>Cancel</Button>
                        <Button onClick={() => { setPositions(prev => prev.map(p => p.id === editingPosition.id ? editingPosition : p)); setEditingPosition(null); }}>Save</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
       )}
       {editingWorkProject && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingWorkProject(null)}>
             <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <Card className="w-96">
                    <CardHeader><CardTitle>{editingWorkProject.project.id ? 'Edit' : 'Add'} Work Project</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="wp-name">Project Name</Label>
                            <Input id="wp-name" value={editingWorkProject.project.name || ''} onChange={e => setEditingWorkProject(prev => prev ? {...prev, project: {...prev.project, name: e.target.value}} : null)} />
                        </div>
                         <div>
                            <Label htmlFor="wp-desc">Description</Label>
                            <Textarea id="wp-desc" value={editingWorkProject.project.description || ''} onChange={e => setEditingWorkProject(prev => prev ? {...prev, project: {...prev.project, description: e.target.value}} : null)} />
                        </div>
                        <div>
                            <Label htmlFor="wp-spec">Linked Specialization</Label>
                            <Select value={editingWorkProject.project.linkedSpecializationId} onValueChange={val => setEditingWorkProject(prev => prev ? {...prev, project: {...prev.project, linkedSpecializationId: val}} : null)}>
                                <SelectTrigger id="wp-spec"><SelectValue placeholder="Select a specialization..." /></SelectTrigger>
                                <SelectContent>
                                    {specializationSkills.map(spec => (
                                        <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingWorkProject(null)}>Cancel</Button>
                        <Button onClick={handleSaveWorkProject}>Save Project</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
       )}
       <IntentionDetailModal
          isOpen={!!selectedIntention}
          onOpenChange={() => setSelectedIntention(null)}
          intention={selectedIntention}
       />
    </div>
    </>
  );
}

export default function SkillPage() {
    return (
        <AuthGuard>
            <SkillPageContent />
        </AuthGuard>
    )
}

    

