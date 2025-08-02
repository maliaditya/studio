
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, Edit, Save, X, BrainCircuit, Blocks, Sprout, Briefcase, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import type { SkillDomain, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition, Project, Feature } from '@/types/workout';
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

function SkillPageContent() {
  const { toast } = useToast();
  const { 
    skillDomains, setSkillDomains, 
    coreSkills, setCoreSkills, 
    projects, setProjects,
    upskillDefinitions, deepWorkDefinitions 
  } = useAuth();
  
  const [newDomainName, setNewDomainName] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  
  const [editingDomain, setEditingDomain] = useState<SkillDomain | null>(null);
  const [editingSkill, setEditingSkill] = useState<CoreSkill | null>(null);

  const [newSpecializationNames, setNewSpecializationNames] = useState<Record<string, string>>({});
  const [newSkillAreaNames, setNewSkillAreaNames] = useState<Record<string, string>>({});
  const [newMicroSkillNames, setNewMicroSkillNames] = useState<Record<string, string>>({});

  const [editingArea, setEditingArea] = useState<SkillArea | null>(null);
  const [editingMicroSkill, setEditingMicroSkill] = useState<MicroSkill | null>(null);
  
  // Project state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newFeatureNames, setNewFeatureNames] = useState<Record<string, string>>({});
  
  const [linkingSkillsForFeature, setLinkingSkillsForFeature] = useState<Feature | null>(null);

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

  const handleUpdateSkillArea = (skillId: string, areaId: string, name: string, purpose: string) => {
    setCoreSkills(prev => prev.map(s => {
        if (s.id === skillId) {
            return { ...s, skillAreas: s.skillAreas.map(a => a.id === areaId ? { ...a, name, purpose } : a) };
        }
        return s;
    }));
  };
  
  const handleDeleteSkillArea = (skillId: string, areaId: string) => {
     setCoreSkills(prev => prev.map(s => s.id === skillId ? { ...s, skillAreas: s.skillAreas.filter(a => a.id !== areaId) } : s));
  };
  
  const handleAddMicroSkill = (areaId: string) => {
    if (!selectedSkillId) return;
    const name = newMicroSkillNames[areaId]?.trim();
    if (!name) return;
    const newMicro: MicroSkill = { id: `ms_${Date.now()}`, name };
    setCoreSkills(prev => prev.map(s => {
        if (s.id === selectedSkillId) {
            return { ...s, skillAreas: s.skillAreas.map(a => a.id === areaId ? { ...a, microSkills: [...a.microSkills, newMicro] } : a) };
        }
        return s;
    }));
    setNewMicroSkillNames(prev => ({...prev, [areaId]: ''}));
  };

  const handleUpdateMicroSkill = (areaId: string, microId: string, name: string) => {
    if (!selectedSkillId) return;
    setCoreSkills(prev => prev.map(s => {
        if (s.id === selectedSkillId) {
            return { ...s, skillAreas: s.skillAreas.map(a => {
                if (a.id === areaId) {
                    return { ...a, microSkills: a.microSkills.map(m => m.id === microId ? { ...m, name } : m) };
                }
                return a;
            })};
        }
        return s;
    }));
  };
  
  const handleDeleteMicroSkill = (areaId: string, microId: string) => {
    if (!selectedSkillId) return;
     setCoreSkills(prev => prev.map(s => {
        if (s.id === selectedSkillId) {
            return { ...s, skillAreas: s.skillAreas.map(a => a.id === areaId ? { ...a, microSkills: a.microSkills.filter(m => m.id !== microId) } : a) };
        }
        return s;
    }));
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
    const isLinked = feature.linkedSkills.some(l => l.microSkillId === microSkillId);
    let updatedSkills;
    if (isLinked) {
        updatedSkills = feature.linkedSkills.filter(l => l.microSkillId !== microSkillId);
    } else {
        updatedSkills = [...feature.linkedSkills, { featureId: feature.id, microSkillId }];
    }
    setProjects(prev => prev.map(p => {
        if (p.id === selectedProject?.id) {
            return { ...p, features: p.features.map(f => f.id === feature.id ? { ...f, linkedSkills: updatedSkills } : f) };
        }
        return p;
    }));
  };

  const selectedCoreSkill = useMemo(() => coreSkills.find(s => s.id === selectedSkillId), [coreSkills, selectedSkillId]);
  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const coreSkillsInDomain = useMemo(() => {
    if (!selectedDomainId) return [];
    return coreSkills.filter(cs => cs.domainId === selectedDomainId);
  }, [coreSkills, selectedDomainId]);
  
  const allMicroSkillsInDomain = useMemo(() => {
    if (!selectedDomainId) return [];
    return coreSkills
        .filter(cs => cs.domainId === selectedDomainId)
        .flatMap(cs => cs.skillAreas)
        .flatMap(sa => sa.microSkills);
  }, [coreSkills, selectedDomainId]);
  
  const handleSelectDomain = (domainId: string) => {
      setSelectedDomainId(domainId);
      setSelectedSkillId(null);
      setSelectedProjectId(null);
  };

  const handleSelectCoreSkill = (skillId: string) => {
    setSelectedSkillId(skillId);
    setSelectedProjectId(null);
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSkillId(null);
  }

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

  return (
    <>
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill & Project Library</CardTitle>
              <CardDescription>Define domains, skills, and projects.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddDomain} className="flex gap-2 mb-4">
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
            </CardContent>
          </Card>
        </aside>
        
        <main className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>{selectedCoreSkill ? `Viewing skill areas for "${selectedCoreSkill.name}"` : selectedProject ? `Viewing features for "${selectedProject.name}"` : 'Select an item from the library.'}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCoreSkill ? (
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
                                                    <BrainCircuit className="h-5 w-5 text-primary"/>
                                                    {editingArea?.id === area.id ? (
                                                        <Input value={editingArea.name} onChange={e => setEditingArea({...editingArea, name: e.target.value})} autoFocus onBlur={() => { handleUpdateSkillArea(selectedSkillId!, area.id, editingArea.name, editingArea.purpose); setEditingArea(null); }} className="h-8 font-semibold"/>
                                                    ) : (
                                                        <span className="font-semibold text-lg">{area.name}</span>
                                                    )}
                                                </div>
                                            </AccordionTrigger>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingArea(area)}><Edit className="h-4 w-4"/></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will delete the "{area.name}" skill area and all its micro-skills.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteSkillArea(selectedSkillId!, area.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                          </div>
                                           {editingArea?.id === area.id ? (
                                             <Input value={editingArea.purpose} onChange={e => setEditingArea({...editingArea, purpose: e.target.value})} onBlur={() => { handleUpdateSkillArea(selectedSkillId!, area.id, editingArea.name, editingArea.purpose); setEditingArea(null); }} placeholder="Purpose..." className="h-8 text-sm mt-1"/>
                                           ) : (
                                              <CardDescription className="pt-1">{area.purpose || 'No purpose defined.'}</CardDescription>
                                           )}
                                      </CardHeader>
                                      <AccordionContent className="px-3 pb-3">
                                          <CardContent className="p-4 bg-muted/50 rounded-md">
                                              <ul className="space-y-2">
                                                {(area.microSkills || []).map(micro => (
                                                  <li key={micro.id} className="flex items-center gap-2 group">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                    {editingMicroSkill?.id === micro.id ? (
                                                        <Input value={editingMicroSkill.name} onChange={e => setEditingMicroSkill({...editingMicroSkill, name: e.target.value})} autoFocus onBlur={() => { handleUpdateMicroSkill(area.id, micro.id, editingMicroSkill.name); setEditingMicroSkill(null); }} className="h-7"/>
                                                    ) : (
                                                        <span className="flex-grow cursor-pointer" onClick={() => setEditingMicroSkill(micro)}>{micro.name}</span>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteMicroSkill(area.id, micro.id)}><Trash2 className="h-3 w-3 text-destructive"/></Button>
                                                  </li>
                                                ))}
                                                 <li className="flex items-center gap-2 pt-2 border-t mt-2">
                                                    <Input value={newMicroSkillNames[area.id] || ''} onChange={e => setNewMicroSkillNames(prev => ({...prev, [area.id]: e.target.value}))} placeholder="Add micro-skill..." className="h-8"/>
                                                    <Button size="sm" className="h-8" onClick={() => handleAddMicroSkill(area.id)}>Add</Button>
                                                </li>
                                              </ul>
                                          </CardContent>
                                      </AccordionContent>
                                  </AccordionItem>
                              </Card>
                          ))}
                      </Accordion>
                  </div>
              ) : selectedProject ? (
                  <div className="space-y-4">
                      <div className="flex items-center gap-2">
                          <Input value={newFeatureNames[selectedProjectId!] || ''} onChange={e => setNewFeatureNames(prev => ({ ...prev, [selectedProjectId!]: e.target.value }))} placeholder="New Feature Name" />
                          <Button onClick={() => handleAddFeature(selectedProjectId!)}>Add Feature</Button>
                      </div>
                      <Accordion type="multiple" className="w-full space-y-2">
                          {selectedProject.features.map(feature => (
                              <Card key={feature.id}>
                                  <AccordionItem value={feature.id} className="border-b-0">
                                      <CardHeader className="p-3">
                                          <div className="flex items-center justify-between w-full">
                                              <AccordionTrigger className="hover:no-underline p-0 flex-grow font-semibold text-lg">{feature.name}</AccordionTrigger>
                                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteFeature(selectedProjectId!, feature.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                          </div>
                                      </CardHeader>
                                      <AccordionContent className="px-3 pb-3">
                                          <div className="p-4 bg-muted/50 rounded-md">
                                              <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-semibold">Linked Skills</h4>
                                                <Popover onOpenChange={(open) => !open && setLinkingSkillsForFeature(null)}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="sm" onClick={() => setLinkingSkillsForFeature(feature)}>Link Skills</Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80">
                                                        <div className="grid gap-4">
                                                            <div className="space-y-2">
                                                                <h4 className="font-medium leading-none">Link skills to "{feature.name}"</h4>
                                                                <p className="text-sm text-muted-foreground">Select required micro-skills from the domain.</p>
                                                            </div>
                                                            <div className="h-64 overflow-y-auto space-y-2 pr-2">
                                                                <Accordion type="multiple" className="w-full">
                                                                    {coreSkillsInDomain.map(coreSkill => (
                                                                        <AccordionItem value={coreSkill.id} key={coreSkill.id}>
                                                                            <AccordionTrigger>{coreSkill.name}</AccordionTrigger>
                                                                            <AccordionContent>
                                                                              <Accordion type="multiple" className="w-full pl-2">
                                                                                {coreSkill.skillAreas.map(area => (
                                                                                   <AccordionItem value={area.id} key={area.id}>
                                                                                    <AccordionTrigger className="text-xs">{area.name}</AccordionTrigger>
                                                                                    <AccordionContent className="pl-4 pt-2 space-y-2">
                                                                                      {area.microSkills.map(ms => (
                                                                                        <div key={ms.id} className="flex items-center space-x-2">
                                                                                            <Checkbox id={`link-${feature.id}-${ms.id}`} checked={feature.linkedSkills.some(l => l.microSkillId === ms.id)} onCheckedChange={() => handleToggleSkillLink(feature, ms.id)} />
                                                                                            <Label htmlFor={`link-${feature.id}-${ms.id}`} className="font-normal text-sm">{ms.name}</Label>
                                                                                        </div>
                                                                                      ))}
                                                                                    </AccordionContent>
                                                                                   </AccordionItem>
                                                                                ))}
                                                                              </Accordion>
                                                                            </AccordionContent>
                                                                        </AccordionItem>
                                                                    ))}
                                                                </Accordion>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                              </div>
                                              <ul className="space-y-1">
                                                {feature.linkedSkills.map(link => {
                                                    const skill = allMicroSkillsInDomain.find(s => s.id === link.microSkillId);
                                                    return <li key={link.microSkillId} className="text-sm text-muted-foreground">{skill?.name || 'Unknown Skill'}</li>
                                                })}
                                              </ul>
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
