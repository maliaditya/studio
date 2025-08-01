
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, Edit, Save, X, BrainCircuit, Blocks, Sprout } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import type { SkillDomain, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition } from '@/types/workout';
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

function SkillPageContent() {
  const { toast } = useToast();
  const { 
    skillDomains, setSkillDomains, 
    coreSkills, setCoreSkills, 
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
    if (selectedDomainId === domainId) {
        setSelectedDomainId(null);
        setSelectedSkillId(null);
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

  const selectedCoreSkill = useMemo(() => coreSkills.find(s => s.id === selectedSkillId), [coreSkills, selectedSkillId]);

  const renderCoreSkillPillar = useCallback((skill: CoreSkill) => {
    let icon;
    switch (skill.type) {
        case 'Foundation': icon = <Blocks className="h-4 w-4"/>; break;
        case 'Professionalism': icon = <Sprout className="h-4 w-4"/>; break;
        case 'Specialization': icon = <BrainCircuit className="h-4 w-4"/>; break;
    }
    return (
        <div key={skill.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-muted">
            <button className="flex items-center gap-2 flex-grow min-w-0" onClick={() => setSelectedSkillId(skill.id)}>
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
  }, [selectedSkillId, coreSkills, handleDeleteCoreSkill]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill Library</CardTitle>
              <CardDescription>Define your high-level domains and core skills.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddDomain} className="flex gap-2 mb-4">
                <Input value={newDomainName} onChange={e => setNewDomainName(e.target.value)} placeholder="New Domain" />
                <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
              </form>
              <Accordion type="single" collapsible className="w-full" value={selectedDomainId || ''} onValueChange={setSelectedDomainId}>
                {skillDomains.map(domain => {
                    const domainCoreSkills = coreSkills.filter(s => s.domainId === domain.id);
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
                                    {domainCoreSkills.filter(s => s.type === 'Foundation').map(renderCoreSkillPillar)}
                                    {domainCoreSkills.filter(s => s.type === 'Professionalism').map(renderCoreSkillPillar)}
                                    <h4 className="font-semibold text-xs text-muted-foreground px-2 pt-2">Specializations</h4>
                                    {domainCoreSkills.filter(s => s.type === 'Specialization').map(renderCoreSkillPillar)}
                                    <div className="flex gap-2 pt-2">
                                      <Input placeholder="New Specialization" value={newSpecializationNames[domain.id] || ''} onChange={e => setNewSpecializationNames(prev => ({...prev, [domain.id]: e.target.value}))}/>
                                      <Button size="icon" onClick={() => handleAddSpecialization(domain.id)}><PlusCircle className="h-4 w-4"/></Button>
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
              <CardTitle>Skill Breakdown</CardTitle>
              <CardDescription>{selectedCoreSkill ? `Viewing skill areas for "${selectedCoreSkill.name}"` : 'Select a core skill from the library to see its breakdown.'}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCoreSkill ? (
                  <div className="space-y-4">
                      <div className="flex items-center gap-2">
                          <Input value={newSkillAreaNames[selectedSkillId!] || ''} onChange={e => setNewSkillAreaNames(prev => ({...prev, [selectedSkillId!]: e.target.value}))} placeholder="New Skill Area Name" />
                          <Button onClick={() => handleAddSkillArea(selectedSkillId!)}>Add Skill Area</Button>
                      </div>
                      <Accordion type="multiple" className="w-full space-y-2">
                          {(selectedCoreSkill.skillAreas || []).map(area => (
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
              ) : (
                <div className="text-center py-10 text-muted-foreground">Select a skill to see its breakdown.</div>
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
    </div>
  );
}

export default function SkillPage() {
    return (
        <AuthGuard>
            <SkillPageContent />
        </AuthGuard>
    )
}
