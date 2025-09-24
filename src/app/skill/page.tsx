

"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, Edit, Save, X, BrainCircuit, Blocks, Sprout, Briefcase, Plus, Building, Unlink, BookCopy, Folder, GitMerge, Workflow, Lightbulb, Flashlight, Frame, Activity, ArrowLeft, Bolt, Flag, Focus, GripVertical, Upload, LineChart as LineChartIcon, Download, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import type { SkillDomain, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition, Project, Feature, Company, Position, WorkProject, ActivityType, DailySchedule, ProjectSkillLink, Resource, ResourceFolder } from '@/types/workout';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { MindMapViewer } from '@/components/MindMapViewer';
import { IntentionDetailPopup } from '@/components/IntentionDetailModal';
import { SkillLibrary } from '@/components/SkillLibrary';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { SpacedRepetitionModal } from '@/components/SpacedRepetitionModal';


function Draggable({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      zIndex: 100,
    } : undefined;
  
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={className}>
        {children}
      </div>
    );
}

function Droppable({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { isOver, setNodeRef } = useDroppable({ id });
  
    return (
      <div ref={setNodeRef} className={cn(className, isOver && "bg-primary/10 ring-2 ring-primary rounded-md")}>
        {children}
      </div>
    );
}

const SpecializationItem: React.FC<{
  spec: CoreSkill;
  allSpecs: CoreSkill[];
  level?: number;
  selectedSkillId: string | null;
  onSelect: (skillId: string) => void;
  onAddSub: (parentId: string) => void;
  onEdit: (skill: CoreSkill) => void;
  onDelete: (skillId: string) => void;
  totalEst: number;
  totalLogged: number;
  onDownload: (skillId: string) => void;
}> = ({ spec, allSpecs, level = 0, selectedSkillId, onSelect, onAddSub, onEdit, onDelete, totalEst, totalLogged, onDownload }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: spec.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100 } : {};
    
    const childSpecs = allSpecs.filter(s => s.parentId === spec.id);

    const formatMinutes = (minutes: number) => {
        if (minutes < 1) return "0m";
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`.trim();
    };

    return (
        <div style={{ marginLeft: `${level * 20}px` }}>
            <Droppable id={spec.id} className="group rounded-md hover:bg-muted">
                <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2">
                    <button className="flex items-center gap-2 flex-grow min-w-0" onClick={() => onSelect(spec.id)}>
                        <span {...listeners} {...attributes} className="cursor-grab p-1 -ml-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <BrainCircuit className="h-4 w-4 flex-shrink-0" />
                        <span className={cn("text-sm truncate", selectedSkillId === spec.id && 'font-semibold text-primary')} title={spec.name}>
                            {spec.name}
                        </span>
                    </button>
                    <div className="flex items-center opacity-0 group-hover:opacity-100">
                        {totalEst > 0 && <Badge variant="secondary" className="mr-2 text-xs">{formatMinutes(totalEst)} est / {formatMinutes(totalLogged)} log</Badge>}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(spec.id)}>
                            <Download className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddSub(spec.id)}>
                            <Plus className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(spec)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(spec.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                </div>
            </Droppable>
            {childSpecs.length > 0 && (
                <div className="pl-4 border-l-2 ml-4">
                    {childSpecs.map(child => {
                        return (
                            <SpecializationItem
                                key={child.id}
                                spec={child}
                                allSpecs={allSpecs}
                                level={level + 1}
                                selectedSkillId={selectedSkillId}
                                onSelect={onSelect}
                                onAddSub={onAddSub}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                totalEst={0}
                                totalLogged={0}
                                onDownload={onDownload}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    );
};


function SkillPageContent() {
  const { toast } = useToast();
  const { 
    skillDomains, setSkillDomains, 
    coreSkills, setCoreSkills, 
    projects, setProjects,
    companies, setCompanies,
    positions, setPositions,
    microSkillMap,
    upskillDefinitions, setUpskillDefinitions,
    deepWorkDefinitions, setDeepWorkDefinitions,
    resources, setResources,
    resourceFolders, setResourceFolders,
    openPistonsFor,
    handleUpdateSkillArea,
    handleDeleteSkillArea,
    handleAddMicroSkill,
    handleUpdateMicroSkill,
    handleDeleteMicroSkill,
    handleToggleMicroSkillRepetition,
    expandedItems,
    handleExpansionChange,
    selectedDomainId, setSelectedDomainId,
    selectedSkillId, setSelectedSkillId,
    selectedProjectId, setSelectedProjectId,
    selectedCompanyId, setSelectedCompanyId,
    openIntentionPopup,
    setSelectedDeepWorkTask,
    setSelectedUpskillTask,
    getDeepWorkNodeType,
    getUpskillNodeType,
    getDescendantLeafNodes,
    selectedMicroSkill,
    setSelectedMicroSkill,
    offerizationPlans,
    logSubTaskTime,
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
  
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadDomainId, setUploadDomainId] = useState<string | null>(null);
  
  const uploadMicroSkillInputRef = useRef<HTMLInputElement>(null);
  const [uploadSkillAreaInfo, setUploadSkillAreaInfo] = useState<{ coreSkillId: string; skillAreaId: string } | null>(null);

  const [repetitionModalState, setRepetitionModalState] = useState<{ isOpen: boolean; skill: MicroSkill | null }>({ isOpen: false, skill: null });

  const [isLogProgressModalOpen, setIsLogProgressModalOpen] = useState(false);
  const [loggingMicroSkill, setLoggingMicroSkill] = useState<MicroSkill | null>(null);
  const [progressInput, setProgressInput] = useState<{ items: string, hours: string, pages: string }>({ items: '', hours: '', pages: '' });


  useEffect(() => {
    // One-time data migration to fix old "Foundation" and "Professionalism" skills
    const professionalismExists = coreSkills.some(s => s.name === 'Professionalism');
    const foundationExists = coreSkills.some(s => s.name === 'Foundation');
    
    if (professionalismExists || foundationExists) {
        let skillsModified = false;
        
        let newCoreSkills = coreSkills.filter(s => s.name !== 'Professionalism');
        if (newCoreSkills.length < coreSkills.length) {
            skillsModified = true;
        }

        newCoreSkills = newCoreSkills.map(s => {
            if (s.name === 'Foundation') {
                skillsModified = true;
                return { ...s, name: 'बोध(Realization)' };
            }
            return s;
        });

        if (skillsModified) {
            setCoreSkills(newCoreSkills);
            toast({
                title: "Data Updated",
                description: "Your 'Foundation' and 'Professionalism' skills have been updated to the new format.",
            });
        }
    }
  }, []); // Run only once on initial mount

  const allDefinitionsMap = useMemo(() => {
    const map = new Map<string, ExerciseDefinition>();
    [...deepWorkDefinitions, ...upskillDefinitions].forEach(def => map.set(def.id, def));
    return map;
  }, [deepWorkDefinitions, upskillDefinitions]);

  const microSkillIntentions = useMemo(() => {
    const map = new Map<string, ExerciseDefinition[]>();
    deepWorkDefinitions.forEach(def => {
        if (getDeepWorkNodeType(def) === 'Intention') {
            const category = def.category;
            if (!map.has(category)) map.set(category, []);
            map.get(category)!.push(def);
        }
    });
    return map;
  }, [deepWorkDefinitions, getDeepWorkNodeType]);

  const microSkillCuriosities = useMemo(() => {
    const map = new Map<string, ExerciseDefinition[]>();
    upskillDefinitions.forEach(def => {
        if (getUpskillNodeType(def) === 'Curiosity') {
            const category = def.category;
            if (!map.has(category)) map.set(category, []);
            map.get(category)!.push(def);
        }
    });
    return map;
  }, [upskillDefinitions, getUpskillNodeType]);

  const microSkillTotals = useMemo(() => {
    const totals = new Map<string, {
      intentionEst: number;
      intentionLogged: number;
      curiosityEst: number;
      curiosityLogged: number;
    }>();
  
    const loggedMinutesMap = new Map<string, number>();
    for (const def of allDefinitionsMap.values()) {
        if (def.loggedDuration && def.loggedDuration > 0) {
            loggedMinutesMap.set(def.id, def.loggedDuration);
        }
    }
  
    for (const [microSkillId, microSkillInfo] of microSkillMap.entries()) {
      let intentionEst = 0;
      let intentionLogged = 0;
      let curiosityEst = 0;
      let curiosityLogged = 0;
  
      const intentions = microSkillIntentions.get(microSkillInfo.microSkillName) || [];
      const curiosities = microSkillCuriosities.get(microSkillInfo.microSkillName) || [];
  
      intentions.forEach(intention => {
        const descendantLeaves = getDescendantLeafNodes(intention.id, 'deepwork');
        intentionEst += descendantLeaves.reduce((sum, node) => sum + (node.estimatedDuration || 0), 0);
        intentionLogged += descendantLeaves.reduce((sum, node) => sum + (loggedMinutesMap.get(node.id) || 0), 0);
      });
      
      curiosities.forEach(curiosity => {
        const descendantLeaves = getDescendantLeafNodes(curiosity.id, 'upskill');
        curiosityEst += descendantLeaves.reduce((sum, node) => sum + (node.estimatedDuration || 0), 0);
        curiosityLogged += descendantLeaves.reduce((sum, node) => sum + (loggedMinutesMap.get(node.id) || 0), 0);
      });
  
      if (intentionEst > 0 || intentionLogged > 0 || curiosityEst > 0 || curiosityLogged > 0) {
        totals.set(microSkillId, { intentionEst, intentionLogged, curiosityEst, curiosityLogged });
      }
    }
    return totals;
  }, [microSkillMap, microSkillIntentions, microSkillCuriosities, allDefinitionsMap, getDescendantLeafNodes]);
  
  const specializationTotals = useMemo(() => {
    const totalsMap = new Map<string, { totalEst: number; totalLogged: number }>();
    const specs = coreSkills.filter(s => s.type === 'Specialization');
    
    specs.forEach(spec => {
      let totalSpecEst = 0;
      let totalSpecLogged = 0;
      
      spec.skillAreas.forEach(area => {
        area.microSkills.forEach(micro => {
          const microTotals = microSkillTotals.get(micro.id);
          if (microTotals) {
            totalSpecEst += microTotals.intentionEst + microTotals.curiosityEst;
            totalSpecLogged += microTotals.intentionLogged + microTotals.curiosityLogged;
          }
        });
      });

      totalsMap.set(spec.id, { totalEst: totalSpecEst, totalLogged: totalSpecLogged });
    });

    return totalsMap;
  }, [coreSkills, microSkillTotals]);
  
  const domainTotals = useMemo(() => {
    const totalsMap = new Map<string, { totalEst: number, totalLogged: number }>();
    skillDomains.forEach(domain => {
      let totalDomainEst = 0;
      let totalDomainLogged = 0;
      
      const domainCoreSkills = coreSkills.filter(s => s.domainId === domain.id && s.type === 'Specialization');
      
      domainCoreSkills.forEach(spec => {
          const specTotals = specializationTotals.get(spec.id);
          if (specTotals) {
              totalDomainEst += specTotals.totalEst;
              totalDomainLogged += specTotals.totalLogged;
          }
      });

      totalsMap.set(domain.id, { totalEst: totalDomainEst, totalLogged: totalDomainLogged });
    });
    return totalsMap;
  }, [skillDomains, coreSkills, specializationTotals]);


  const handleUploadClick = (domainId: string) => {
    setUploadDomainId(domainId);
    uploadInputRef.current?.click();
  };
  
  const handleMicroSkillUploadClick = (coreSkillId: string, skillAreaId: string) => {
    setUploadSkillAreaInfo({ coreSkillId, skillAreaId });
    uploadMicroSkillInputRef.current?.click();
  };
  
  const findOrCreateFolder = (path: string[], folders: ResourceFolder[]): { folderId: string; updatedFolders: ResourceFolder[] } => {
      let parentId: string | null = null;
      let updatedFolders = [...folders];
  
      path.forEach(folderName => {
          let folder = updatedFolders.find(f => f.name === folderName && f.parentId === parentId);
          if (!folder) {
              folder = { id: `folder_${Date.now()}_${Math.random()}`, name: folderName, parentId: parentId, icon: 'Folder' };
              updatedFolders.push(folder);
          }
          parentId = folder.id;
      });
      return { folderId: parentId!, updatedFolders };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadDomainId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result;
            if (typeof content !== 'string') throw new Error("Invalid file content");
            
            const specializationData = JSON.parse(content);
            
            const newCoreSkill: CoreSkill = {
                id: `cs_${Date.now()}`,
                domainId: uploadDomainId,
                name: specializationData.name,
                type: 'Specialization',
                skillAreas: [],
                parentId: null
            };

            const newUpskillDefs: ExerciseDefinition[] = [];
            let newResources = [...resources];
            let newResourceFolders = [...resourceFolders];
            
            const domainName = skillDomains.find(d => d.id === uploadDomainId)?.name || 'Unknown Domain';

            let currentFolderPath = ["Skills & Project Resources", domainName, specializationData.name];
            
            (specializationData.skillAreas || []).forEach((areaData: any) => {
                const areaFolderPath = [...currentFolderPath, areaData.name];
                const newSkillArea: SkillArea = { id: `sa_${Date.now()}_${Math.random()}`, name: areaData.name, purpose: areaData.purpose || '', microSkills: [] };

                (areaData.microSkills || []).forEach((microData: any) => {
                    const microSkillFolderPath = [...areaFolderPath, microData.name];
                    const newMicroSkill: MicroSkill = { id: `ms_${Date.now()}_${Math.random()}`, name: microData.name, isReadyForRepetition: false };

                    (microData.curiosities || []).forEach((curiosityData: any) => {
                        const curiosityFolderPath = [...microSkillFolderPath, curiosityData.name];
                        const newCuriosity: ExerciseDefinition = { id: `def_${Date.now()}_${Math.random()}`, name: curiosityData.name, category: newMicroSkill.name as any, description: curiosityData.description, link: curiosityData.link, estimatedDuration: curiosityData.estimatedDuration, linkedUpskillIds: [] };

                        (curiosityData.objectives || []).forEach((objectiveData: any) => {
                            const objectiveFolderPath = [...curiosityFolderPath, objectiveData.name];
                            const newObjective: ExerciseDefinition = { id: `def_${Date.now()}_${Math.random()}`, name: objectiveData.name, category: newMicroSkill.name as any, description: objectiveData.description, link: objectiveData.link, estimatedDuration: objectiveData.estimatedDuration, linkedUpskillIds: [] };

                            (objectiveData.visualizations || []).forEach((vizData: any) => {
                                const vizFolderPath = [...objectiveFolderPath, vizData.name];
                                const newViz: ExerciseDefinition = { id: `def_${Date.now()}_${Math.random()}`, name: vizData.name, category: newMicroSkill.name as any, description: vizData.description, link: vizData.link, estimatedDuration: vizData.estimatedDuration, linkedResourceIds: [] };

                                (vizData.resourceCards || []).forEach((cardData: any) => {
                                    const { folderId, updatedFolders } = findOrCreateFolder(vizFolderPath, newResourceFolders);
                                    newResourceFolders = updatedFolders;
                                    const newResource: Resource = {
                                        id: `res_${Date.now()}_${Math.random()}`,
                                        name: `${vizData.name} - ${cardData.name}`,
                                        folderId: folderId,
                                        type: 'card',
                                        createdAt: new Date().toISOString(),
                                        points: (cardData.points || []).map((p: any) => ({ id: `point_${Date.now()}_${Math.random()}`, text: p.text, type: p.type || 'text' }))
                                    };
                                    newResources.push(newResource);
                                    newViz.linkedResourceIds!.push(newResource.id);
                                });
                                
                                newObjective.linkedUpskillIds!.push(newViz.id);
                                newUpskillDefs.push(newViz);
                            });
                            newCuriosity.linkedUpskillIds!.push(newObjective.id);
                            newUpskillDefs.push(newObjective);
                        });
                        newUpskillDefs.push(newCuriosity);
                    });
                    newSkillArea.microSkills.push(newMicroSkill);
                });
                newCoreSkill.skillAreas.push(newSkillArea);
            });
            
            setCoreSkills(prev => [...prev, newCoreSkill]);
            setUpskillDefinitions(prev => [...prev, ...newUpskillDefs]);
            setResources(newResources);
            setResourceFolders(newResourceFolders);

            toast({ title: "Upload Successful", description: `Specialization "${newCoreSkill.name}" has been added.` });

        } catch (error) {
            console.error("Failed to parse specialization JSON", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ title: "Upload Failed", description: `Invalid JSON format: ${errorMessage}`, variant: 'destructive' });
        }
    };
    reader.readAsText(file);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleMicroSkillFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadSkillAreaInfo) return;

    const { coreSkillId, skillAreaId } = uploadSkillAreaInfo;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result;
            if (typeof content !== 'string') throw new Error("Invalid file content");
            
            const microSkillsData = JSON.parse(content);
            if (!Array.isArray(microSkillsData)) throw new Error("JSON must be an array of micro-skills.");

            const newMicroSkills: MicroSkill[] = [];
            const newUpskillDefs: ExerciseDefinition[] = [];
            let newResources = [...resources];
            let newResourceFolders = [...resourceFolders];

            const coreSkill = coreSkills.find(cs => cs.id === coreSkillId);
            const skillArea = coreSkill?.skillAreas.find(sa => sa.id === skillAreaId);
            const domain = skillDomains.find(d => d.id === coreSkill?.domainId);

            if (!coreSkill || !skillArea || !domain) {
                throw new Error("Target specialization or skill area not found.");
            }

            const basePath = ["Skills & Project Resources", domain.name, coreSkill.name, skillArea.name];

            microSkillsData.forEach((microData: any) => {
                const microSkillFolderPath = [...basePath, microData.name];
                const newMicroSkill: MicroSkill = { id: `ms_${Date.now()}_${Math.random()}`, name: microData.name, isReadyForRepetition: false };
                
                (microData.curiosities || []).forEach((curiosityData: any) => {
                    const curiosityFolderPath = [...microSkillFolderPath, curiosityData.name];
                    const newCuriosity: ExerciseDefinition = { id: `def_${Date.now()}_${Math.random()}`, name: curiosityData.name, category: newMicroSkill.name as any, description: curiosityData.description, link: curiosityData.link, estimatedDuration: curiosityData.estimatedDuration, linkedUpskillIds: [] };

                    (curiosityData.objectives || []).forEach((objectiveData: any) => {
                        const objectiveFolderPath = [...curiosityFolderPath, objectiveData.name];
                        const newObjective: ExerciseDefinition = { id: `def_${Date.now()}_${Math.random()}`, name: objectiveData.name, category: newMicroSkill.name as any, description: objectiveData.description, link: objectiveData.link, estimatedDuration: objectiveData.estimatedDuration, linkedUpskillIds: [] };

                        (objectiveData.visualizations || []).forEach((vizData: any) => {
                            const vizFolderPath = [...objectiveFolderPath, vizData.name];
                            const newViz: ExerciseDefinition = { id: `def_${Date.now()}_${Math.random()}`, name: vizData.name, category: newMicroSkill.name as any, description: vizData.description, link: vizData.link, estimatedDuration: vizData.estimatedDuration, linkedResourceIds: [] };

                             (vizData.resourceCards || []).forEach((cardData: any) => {
                                const { folderId, updatedFolders } = findOrCreateFolder(vizFolderPath, newResourceFolders);
                                newResourceFolders = updatedFolders;
                                const newResource: Resource = {
                                    id: `res_${Date.now()}_${Math.random()}`,
                                    name: `${vizData.name} - ${cardData.name}`,
                                    folderId: folderId,
                                    type: 'card',
                                    createdAt: new Date().toISOString(),
                                    points: (cardData.points || []).map((p: any) => ({ id: `point_${Date.now()}_${Math.random()}`, text: p.text, type: p.type || 'text' }))
                                };
                                newResources.push(newResource);
                                newViz.linkedResourceIds!.push(newResource.id);
                            });

                            newObjective.linkedUpskillIds!.push(newViz.id);
                            newUpskillDefs.push(newViz);
                        });
                        newCuriosity.linkedUpskillIds!.push(newObjective.id);
                        newUpskillDefs.push(newObjective);
                    });
                    newUpskillDefs.push(newCuriosity);
                });
                newMicroSkills.push(newMicroSkill);
            });
            
            setCoreSkills(prev => prev.map(cs => {
                if (cs.id === coreSkillId) {
                    return {
                        ...cs,
                        skillAreas: cs.skillAreas.map(sa => {
                            if (sa.id === skillAreaId) {
                                return { ...sa, microSkills: [...sa.microSkills, ...newMicroSkills] };
                            }
                            return sa;
                        })
                    };
                }
                return cs;
            }));
            
            setUpskillDefinitions(prev => [...prev, ...newUpskillDefs]);
            setResources(newResources);
            setResourceFolders(newResourceFolders);

            toast({ title: "Upload Successful", description: `${newMicroSkills.length} micro-skills added to "${skillArea.name}".` });

        } catch (error) {
            console.error("Failed to parse micro-skill JSON", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ title: "Upload Failed", description: `Invalid JSON format: ${errorMessage}`, variant: 'destructive' });
        }
    };
    reader.readAsText(file);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDownloadSpecialization = (skillId: string) => {
    const specToDownload = coreSkills.find(s => s.id === skillId);
    if (!specToDownload) {
      toast({ title: 'Error', description: 'Specialization not found.', variant: 'destructive' });
      return;
    }

    const getDescendantSpecs = (parentId: string): CoreSkill[] => {
      const children = coreSkills.filter(s => s.parentId === parentId);
      return [...children, ...children.flatMap(c => getDescendantSpecs(c.id))];
    };

    const allSpecsInTree = [specToDownload, ...getDescendantSpecs(skillId)];
    const allMicroSkillNames = new Set(allSpecsInTree.flatMap(s => s.skillAreas.flatMap(sa => sa.microSkills.map(ms => ms.name))));
    
    const relevantUpskillTasks = upskillDefinitions.filter(t => allMicroSkillNames.has(t.category));
    const relevantDeepWorkTasks = deepWorkDefinitions.filter(t => allMicroSkillNames.has(t.category));

    const exportData = {
      ...specToDownload,
      childSpecializations: getDescendantSpecs(skillId),
      upskillTasks: relevantUpskillTasks,
      deepWorkTasks: relevantDeepWorkTasks
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${specToDownload.name}_specialization.json`;
    link.click();

    toast({ title: 'Download Started', description: `Your specialization "${specToDownload.name}" is being downloaded.` });
  };
  
  const handleDownloadMicroSkill = (microSkill: MicroSkill) => {
    const getDescendants = (startNodeId: string): any[] => {
      const startNode = upskillDefinitions.find(d => d.id === startNodeId);
      if (!startNode) return [];

      const children = (startNode.linkedUpskillIds || [])
        .map(id => getDescendants(id))
        .flat();
      
      const resourceCards = (startNode.linkedResourceIds || [])
        .map(id => resources.find(r => r.id === id))
        .filter(r => r?.type === 'card' && r.points)
        .map(rc => ({ name: rc!.name, points: rc!.points }));

      const nodeData = {
        name: startNode.name,
        description: startNode.description,
        link: startNode.link,
        estimatedDuration: startNode.estimatedDuration,
        resourceCards: resourceCards.length > 0 ? resourceCards : undefined,
      };

      if (getUpskillNodeType(startNode) === 'Visualization') {
        return [nodeData];
      }

      if (getUpskillNodeType(startNode) === 'Objective') {
        return [{...nodeData, visualizations: children }];
      }

      if (getUpskillNodeType(startNode) === 'Curiosity') {
        return [{...nodeData, objectives: children }];
      }
      
      return [nodeData];
    };

    const curiosities = upskillDefinitions.filter(def => def.category === microSkill.name && getUpskillNodeType(def) === 'Curiosity');
    const microSkillData = {
      name: microSkill.name,
      curiosities: curiosities.flatMap(c => getDescendants(c.id)),
    };
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify([microSkillData], null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${microSkill.name}_micro-skill.json`;
    link.click();
    
    toast({ title: 'Download Started', description: `Your micro-skill "${microSkill.name}" is being downloaded.` });
  };


  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    const newDomain: SkillDomain = { id: `d_${Date.now()}`, name: newDomainName.trim() };
    const foundationSkill: CoreSkill = { id: `cs_${Date.now()}_f`, domainId: newDomain.id, name: 'बोध(Realization)', type: 'Foundation', skillAreas: [], parentId: null };
    
    setSkillDomains(prev => [...prev, newDomain]);
    setCoreSkills(prev => [...prev, foundationSkill]);
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

  const handleAddSpecialization = (domainId: string, parentId: string | null = null) => {
    const name = newSpecializationNames[parentId || domainId]?.trim();
    if (!name) return;
    const newSkill: CoreSkill = { id: `cs_${Date.now()}_s`, domainId, name, type: 'Specialization', skillAreas: [], parentId };
    setCoreSkills(prev => [...prev, newSkill]);
    setNewSpecializationNames(prev => ({ ...prev, [parentId || domainId]: '' }));
    setSelectedSkillId(newSkill.id);
    toast({ title: "Specialization Added", description: `"${newSkill.name}" was added.` });
  };
  
  const handleDeleteCoreSkill = (skillId: string) => {
    setCoreSkills(prev => prev.filter(s => s.id !== skillId && s.parentId !== skillId));
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
  
  const linkedTasksByCoreSkill = useMemo(() => {
    if (!selectedProject) return new Map();
  
    const taskMap = new Map<string, {
      microSkills: Map<string, { microSkill: MicroSkill, intentions: ExerciseDefinition[], curiosities: ExerciseDefinition[] }>
    }>();
  
    const projectIntentions = deepWorkDefinitions.filter(def => 
      (def.linkedProjectIds || []).includes(selectedProject.id)
    );
  
    const projectCuriosities = upskillDefinitions.filter(def => 
        (def.linkedProjectIds || []).includes(selectedProject.id)
    );
      
    const processTasks = (tasks: ExerciseDefinition[], type: 'intention' | 'curiosity') => {
        tasks.forEach(task => {
            const microSkillInfo = Array.from(microSkillMap.entries()).find(([,v]) => v.microSkillName === task.category);
            if (!microSkillInfo) return;
    
            const [microSkillId, info] = microSkillInfo;
            const { coreSkillName, skillAreaName, microSkillName } = info;
            
            if (!taskMap.has(coreSkillName)) {
                taskMap.set(coreSkillName, { microSkills: new Map() });
            }
            const coreSkillData = taskMap.get(coreSkillName)!;
            
            const mapKey = `${skillAreaName} > ${microSkillName}`;
            if (!coreSkillData.microSkills.has(mapKey)) {
                const microSkill = coreSkills.flatMap(cs => cs.skillAreas).flatMap(sa => sa.microSkills).find(ms => ms.id === microSkillId);
                if (microSkill) {
                    coreSkillData.microSkills.set(mapKey, { microSkill, intentions: [], curiosities: [] });
                }
            }
            
            const microSkillData = coreSkillData.microSkills.get(mapKey);
            if (microSkillData) {
                if(type === 'intention') microSkillData.intentions.push(task);
                else microSkillData.curiosities.push(task);
            }
        });
    };

    processTasks(projectIntentions, 'intention');
    processTasks(projectCuriosities, 'curiosity');

    return taskMap;
  }, [selectedProject, microSkillMap, coreSkills, deepWorkDefinitions, upskillDefinitions]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setCoreSkills(prevSkills => {
            const activeSkill = prevSkills.find(s => s.id === active.id);
            const overSkill = prevSkills.find(s => s.id === over.id);

            if (activeSkill && overSkill && activeSkill.type === 'Specialization' && overSkill.type === 'Specialization') {
                return prevSkills.map(s => s.id === active.id ? { ...s, parentId: over.id as string } : s);
            }
            return prevSkills;
        });
    }
  };

  const handleSelectForDeepWork = (microSkill: MicroSkill) => {
    setSelectedMicroSkill(microSkill);
    router.push('/deep-work');
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 1) return "0m";
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`.trim();
  };

  const handleOpenLogProgressModal = (microSkill: MicroSkill) => {
    setLoggingMicroSkill(microSkill);
    setIsLogProgressModalOpen(true);
    setProgressInput({ 
        items: microSkill.completedItems?.toString() || '', 
        hours: microSkill.completedHours?.toString() || '',
        pages: microSkill.completedPages?.toString() || '',
    });
  };
  
  const handleLogProgress = () => {
    if (!loggingMicroSkill) return;

    const { items, hours, pages } = progressInput;
    const completedItems = parseInt(items) || 0;
    const completedHours = parseFloat(hours) || 0;
    const completedPages = parseInt(pages) || 0;

    setCoreSkills(prevCoreSkills => prevCoreSkills.map(cs => ({
        ...cs,
        skillAreas: cs.skillAreas.map(sa => ({
            ...sa,
            microSkills: sa.microSkills.map(ms => {
                if (ms.id === loggingMicroSkill.id) {
                    return {
                        ...ms,
                        completedItems: completedItems,
                        completedHours: completedHours,
                        completedPages: completedPages,
                    };
                }
                return ms;
            })
        }))
    })));

    toast({ title: "Progress Logged", description: `Progress for "${loggingMicroSkill.name}" has been updated.`});
    setIsLogProgressModalOpen(false);
  };
  
  const learningPlanForSkill = useMemo(() => {
    if (!loggingMicroSkill) return null;
    const microSkillInfo = microSkillMap.get(loggingMicroSkill.id);
    if (!microSkillInfo) return null;
    const coreSkill = coreSkills.find(cs => cs.name === microSkillInfo.coreSkillName);
    if (!coreSkill) return null;
    return offerizationPlans[coreSkill.id]?.learningPlan || null;
  }, [loggingMicroSkill, microSkillMap, coreSkills, offerizationPlans]);

  return (
    <DndContext onDragEnd={handleDragEnd}>
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill & Experience Library</CardTitle>
              <CardDescription>Define domains, skills, projects, and work history.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full" value={expandedItems} onValueChange={handleExpansionChange}>
                <AccordionItem value="skills-domains">
                  <AccordionTrigger>Skills & Projects</AccordionTrigger>
                  <AccordionContent>
                      <form onSubmit={handleAddDomain} className="flex gap-2 my-2">
                        <Input value={newDomainName} onChange={e => setNewDomainName(e.target.value)} placeholder="New Domain" />
                        <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
                      </form>
                      <Accordion type="single" collapsible className="w-full" value={selectedDomainId || ''} onValueChange={handleSelectDomain}>
                        {skillDomains.map(domain => {
                            const domainCoreSkills = coreSkills.filter(s => s.domainId === domain.id);
                            const domainProjects = projects.filter(p => p.domainId === domain.id);
                            const topLevelSpecializations = domainCoreSkills.filter(s => s.type === 'Specialization' && !s.parentId);
                            
                            const { totalEst, totalLogged } = domainTotals.get(domain.id) || { totalEst: 0, totalLogged: 0 };
                            
                            return (
                                <AccordionItem value={domain.id} key={domain.id}>
                                    <div className="flex items-center justify-between w-full group">
                                        <AccordionTrigger className="flex-grow">
                                          <div className="flex items-center gap-2">
                                            <span>{domain.name}</span>
                                            {totalEst > 0 && <Badge variant="outline" className="text-xs">{formatMinutes(totalEst)} est / {formatMinutes(totalLogged)} log</Badge>}
                                          </div>
                                        </AccordionTrigger>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 ml-2">
                                           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleUploadClick(domain.id); }}>
                                                <Upload className="h-4 w-4 text-blue-500" />
                                            </Button>
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
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteDomain(domain.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                    </div>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-xs text-muted-foreground px-2">Core Pillars</h4>
                                            {domainCoreSkills.filter(s => s.type !== 'Specialization').map(skill => (
                                              <Button key={skill.id} variant="ghost" size="sm" className={cn("w-full justify-start", selectedSkillId === skill.id && "bg-accent font-semibold")} onClick={() => handleSelectCoreSkill(skill.id)}>
                                                  {skill.type === 'Foundation' ? <Blocks className="mr-2 h-4 w-4"/> : <Sprout className="mr-2 h-4 w-4"/>}
                                                  {skill.name}
                                              </Button>
                                            ))}
                                            <h4 className="font-semibold text-xs text-muted-foreground px-2 pt-2">Specializations</h4>
                                            {topLevelSpecializations.map(spec => {
                                                const { totalEst, totalLogged } = specializationTotals.get(spec.id) || { totalEst: 0, totalLogged: 0 };
                                                return (
                                                    <SpecializationItem
                                                        key={spec.id}
                                                        spec={spec}
                                                        allSpecs={domainCoreSkills}
                                                        selectedSkillId={selectedSkillId}
                                                        onSelect={handleSelectCoreSkill}
                                                        onAddSub={(parentId) => handleAddSpecialization(domain.id, parentId)}
                                                        onEdit={setEditingSkill}
                                                        onDelete={handleDeleteCoreSkill}
                                                        totalEst={totalEst}
                                                        totalLogged={totalLogged}
                                                        onDownload={handleDownloadSpecialization}
                                                    />
                                                );
                                            })}
                                            <div className="flex gap-2 pt-2">
                                              <Input placeholder="New Specialization" value={newSpecializationNames[domain.id] || ''} onChange={e => setNewSpecializationNames(prev => ({...prev, [domain.id]: e.target.value}))}/>
                                              <Button size="icon" onClick={() => handleAddSpecialization(domain.id)}><PlusCircle className="h-4 w-4"/></Button>
                                            </div>
                                            <h4 className="font-semibold text-xs text-muted-foreground px-2 pt-4">Projects</h4>
                                            {domainProjects.map(p => (
                                                <div key={p.id} className="group flex items-center justify-between pl-2 rounded-md hover:bg-muted">
                                                    <Button variant="ghost" size="sm" className={cn("flex-grow justify-start", selectedProjectId === p.id && "bg-accent font-semibold")} onClick={() => handleSelectProject(p.id)}>
                                                        <Briefcase className="mr-2 h-4 w-4"/>
                                                        {p.name}
                                                    </Button>
                                                    <div className="flex items-center opacity-0 group-hover:opacity-100">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingProject(p)}><Edit className="h-4 w-4"/></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will permanently delete the "{p.name}" project.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteProject(p.id)}>Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
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
              <CardTitle>{selectedCoreSkill ? selectedCoreSkill.name : selectedProject ? selectedProject.name : selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.name : 'Details'}</CardTitle>
              <CardDescription>{selectedCoreSkill ? `Viewing skill areas for "${selectedCoreSkill.name}"` : selectedProject ? `Viewing linked tasks for "${selectedProject.name}"` : selectedCompanyId ? `Viewing positions for "${companies.find(c => c.id === selectedCompanyId)?.name}"` : 'Select an item from the library.'}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProject ? (
                  <div className="space-y-4">
                      {Array.from(linkedTasksByCoreSkill.entries()).map(([coreSkillName, data]) => (
                          <Card key={coreSkillName}>
                              <CardHeader className="py-3">
                                  <CardTitle className="text-base">{coreSkillName}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Array.from(data.microSkills.entries()).map(([mapKey, { microSkill, intentions, curiosities }]) => {
                                      const skillAreaName = mapKey.split(' > ')[0];
                                      
                                      return (
                                        <Card key={mapKey} className="w-full">
                                            <CardHeader className="p-3">
                                              <div className="flex justify-between items-start gap-2">
                                                <CardTitle className="text-sm flex-grow">{microSkill.name}</CardTitle>
                                                <Badge variant="outline">{skillAreaName}</Badge>
                                              </div>
                                            </CardHeader>
                                            <CardContent className="p-3 pt-0 grid grid-cols-2 gap-4">
                                              <div className="space-y-1">
                                                  <h4 className="font-semibold text-xs mb-1 flex items-center gap-1"><Flashlight className="h-3 w-3 text-amber-500" />Curiosities</h4>
                                                  {curiosities.length > 0 ? (
                                                    <ul className="space-y-1 text-xs">
                                                      {curiosities.map(task => (
                                                        <li key={task.id}>
                                                          <button onClick={() => openIntentionPopup(task.id)} className="text-muted-foreground hover:text-primary truncate w-full text-left">{task.name}</button>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  ) : <p className="text-muted-foreground text-xs italic">None</p>}
                                              </div>
                                              <div className="space-y-1">
                                                  <h4 className="font-semibold text-xs mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3 text-green-500" />Intentions</h4>
                                                   {intentions.length > 0 ? (
                                                    <ul className="space-y-1 text-xs">
                                                      {intentions.map(intention => (
                                                        <li key={intention.id}>
                                                          <button onClick={() => openIntentionPopup(intention.id)} className="text-muted-foreground hover:text-primary truncate w-full text-left">{intention.name}</button>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  ) : <p className="text-muted-foreground text-xs italic">None</p>}
                                              </div>
                                            </CardContent>
                                        </Card>
                                      )
                                  })}
                              </CardContent>
                          </Card>
                      ))}
                      {linkedTasksByCoreSkill.size === 0 && <p className="text-center text-muted-foreground">No Intentions or Curiosities linked to this project yet.</p>}
                  </div>
              ) : selectedCoreSkill?.type === 'Foundation' ? (
                  <div className="space-y-4">
                      {coreSkills.filter(spec => {
                          const specTotals = specializationTotals.get(spec.id);
                          return spec.type === 'Specialization' && specTotals && specTotals.totalLogged >= 1200; // 20 hours
                      }).sort((a,b) => (specializationTotals.get(b.id)?.totalLogged || 0) - (specializationTotals.get(a.id)?.totalLogged || 0))
                      .map(spec => {
                          const allIntentions = spec.skillAreas.flatMap(area => 
                              area.microSkills.flatMap(ms => microSkillIntentions.get(ms.name) || [])
                          );
                          return (
                              <Card key={spec.id}>
                                  <CardHeader className="py-3">
                                      <CardTitle className="text-base">{spec.name}</CardTitle>
                                      <CardDescription>
                                          Total Logged: {formatMinutes((specializationTotals.get(spec.id)?.totalLogged || 0))}
                                      </CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-3 pt-0">
                                      <h4 className="font-semibold text-xs mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3 text-green-500" />Intentions</h4>
                                      {allIntentions.length > 0 ? (
                                        <ul className="space-y-1 text-xs">
                                          {allIntentions.map(intention => (
                                            <li key={intention.id}>
                                              <button onClick={() => openIntentionPopup(intention.id)} className="text-muted-foreground hover:text-primary truncate w-full text-left">{intention.name}</button>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : <p className="text-muted-foreground text-xs italic">No intentions defined.</p>}
                                  </CardContent>
                              </Card>
                          );
                      })}
                  </div>
              ) : selectedCoreSkill ? (
                  <div className="space-y-4">
                      {selectedCoreSkill.type === 'Specialization' && (
                          <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Skill Areas</CardTitle>
                              </CardHeader>
                              <CardContent>
                                  <div className="flex items-center gap-2">
                                    <Input value={newSkillAreaNames[selectedSkillId!] || ''} onChange={e => setNewSkillAreaNames(prev => ({...prev, [selectedSkillId!]: e.target.value}))} placeholder="New Skill Area Name" />
                                    <Button onClick={() => handleAddSkillArea(selectedSkillId!)}>Add</Button>
                                  </div>
                              </CardContent>
                          </Card>
                      )}
                       <Accordion type="multiple" className="w-full space-y-2">
                          {selectedCoreSkill.skillAreas.map(area => {
                              const totalAreaEst = area.microSkills.reduce((areaSum, micro) => {
                                  const microTotals = microSkillTotals.get(micro.id);
                                  return areaSum + (microTotals ? microTotals.intentionEst + microTotals.curiosityEst : 0);
                              }, 0);
                          
                              const totalAreaLogged = area.microSkills.reduce((areaSum, micro) => {
                                  const microTotals = microSkillTotals.get(micro.id);
                                  return areaSum + (microTotals ? microTotals.intentionLogged + microTotals.curiosityLogged : 0);
                              }, 0);

                              return (
                                <Card key={area.id}>
                                  <AccordionItem value={area.id} className="border-b-0">
                                    <CardHeader className="p-3">
                                      <div className="flex items-center justify-between w-full">
                                        <AccordionTrigger className="hover:no-underline p-0 flex-grow">
                                          <div className="flex items-center gap-2">
                                            <Folder className="h-5 w-5 text-primary"/>
                                            <span className="font-semibold text-lg">{area.name}</span>
                                          </div>
                                        </AccordionTrigger>
                                        <div className="flex items-center">
                                           {totalAreaEst > 0 && <Badge variant="secondary" className="mr-2">{formatMinutes(totalAreaEst)} est / {formatMinutes(totalAreaLogged)} log</Badge>}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleMicroSkillUploadClick(selectedCoreSkill.id, area.id); }}>
                                                <Upload className="h-4 w-4 text-blue-500" />
                                            </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingArea({skillId: selectedCoreSkill.id, area}); }}><Edit className="h-4 w-4"/></Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete "{area.name}"?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the skill area and all its micro-skills.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSkillArea(selectedCoreSkill.id, area.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <AccordionContent className="px-3 pb-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {area.microSkills.map(micro => {
                                            const {
                                              intentionEst = 0,
                                              intentionLogged = 0,
                                              curiosityEst = 0,
                                              curiosityLogged = 0
                                            } = microSkillTotals.get(micro.id) || {};
                                            
                                            const relatedIntentions = microSkillIntentions.get(micro.name) || [];
                                            const relatedCuriosities = microSkillCuriosities.get(micro.name) || [];
                                            const learningPlan = offerizationPlans[selectedCoreSkill!.id]?.learningPlan;
                                            const hasLearningPlan = (learningPlan?.audioVideoResources?.length ?? 0) > 0 || (learningPlan?.bookWebpageResources?.length ?? 0) > 0;

                                            return (
                                              <Card key={micro.id} className="flex flex-col group/item">
                                                  <CardHeader className="p-3 flex flex-row items-center justify-between">
                                                      <CardTitle className="text-base flex-grow cursor-pointer hover:underline" onClick={() => setSelectedMicroSkill(micro)}>{micro.name}</CardTitle>
                                                      <div className="flex items-center">
                                                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/item:opacity-100" onClick={() => handleSelectForDeepWork(micro)}>
                                                            <Briefcase className="h-4 w-4 text-muted-foreground hover:text-primary"/>
                                                          </Button>
                                                          {hasLearningPlan && (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/item:opacity-100" onClick={() => handleOpenLogProgressModal(micro)}>
                                                              <ClipboardList className="h-4 w-4 text-teal-500" />
                                                            </Button>
                                                          )}
                                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadMicroSkill(micro)}>
                                                            <Download className="h-4 w-4 text-blue-500" />
                                                          </Button>
                                                          <button onClick={() => setRepetitionModalState({ isOpen: true, skill: micro })}>
                                                              <LineChartIcon className="h-4 w-4 text-muted-foreground hover:text-primary"/>
                                                          </button>
                                                          <Checkbox
                                                            id={`rep-${micro.id}`}
                                                            checked={micro.isReadyForRepetition}
                                                            onCheckedChange={(checked) => handleToggleMicroSkillRepetition(selectedCoreSkill.id, area.id, micro.id, !!checked)}
                                                            className="ml-2"
                                                          />
                                                      </div>
                                                  </CardHeader>
                                                  <CardContent className="p-3 pt-0 grid grid-cols-2 gap-4 flex-grow">
                                                      <div className="border-r pr-2">
                                                          <h4 className="font-semibold text-xs mb-1 flex items-center gap-1"><Flashlight className="h-3 w-3 text-amber-500" />Curiosities</h4>
                                                          <Badge variant="outline" className="text-xs mb-1 w-full justify-center">{formatMinutes(curiosityEst)} est / {formatMinutes(curiosityLogged)} log</Badge>
                                                          {relatedCuriosities.length > 0 ? (
                                                              <ul className="space-y-1 text-xs">
                                                                  {relatedCuriosities.map(curiosity => (
                                                                      <li key={curiosity.id}>
                                                                          <button onClick={() => openIntentionPopup(curiosity.id)} className="text-muted-foreground hover:text-primary truncate w-full text-left">{curiosity.name}</button>
                                                                      </li>
                                                                  ))}
                                                              </ul>
                                                          ) : <p className="text-muted-foreground text-xs italic">None</p>}
                                                      </div>
                                                      <div>
                                                          <h4 className="font-semibold text-xs mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3 text-green-500" />Intentions</h4>
                                                          <Badge variant="outline" className="text-xs mb-1 w-full justify-center">{formatMinutes(intentionEst)} est / {formatMinutes(intentionLogged)} log</Badge>
                                                           {relatedIntentions.length > 0 ? (
                                                              <ul className="space-y-1 text-xs">
                                                                  {relatedIntentions.map(intention => (
                                                                      <li key={intention.id}>
                                                                          <button onClick={() => openIntentionPopup(intention.id)} className="text-muted-foreground hover:text-primary truncate w-full text-left">{intention.name}</button>
                                                                      </li>
                                                                  ))}
                                                              </ul>
                                                          ) : <p className="text-muted-foreground text-xs italic">None</p>}
                                                      </div>
                                                  </CardContent>
                                                   <CardFooter className="p-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <div className="flex justify-end w-full">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingMicroSkill({skillId: selectedCoreSkill.id, areaId: area.id, microSkill: micro})}><Edit className="h-4 w-4"/></Button>
                                                            <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete "{micro.name}"?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will permanently delete this micro-skill.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteMicroSkill(selectedCoreSkill!.id, area.id, micro.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                  </CardFooter>
                                              </Card>
                                            )
                                        })}
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
                              );
                          })}
                       </Accordion>
                  </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">Select an item to see its breakdown.</div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      <input
        type="file"
        ref={uploadInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
       <input
        type="file"
        ref={uploadMicroSkillInputRef}
        onChange={handleMicroSkillFileChange}
        accept=".json"
        className="hidden"
      />
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
                                    {coreSkills.filter(s => s.type === 'Specialization').map(spec => (
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
      <SpacedRepetitionModal 
        modalState={repetitionModalState} 
        onOpenChange={(isOpen) => setRepetitionModalState(prev => ({ ...prev, isOpen }))} 
      />
      
      {isLogProgressModalOpen && loggingMicroSkill && (
        <Dialog open={isLogProgressModalOpen} onOpenChange={setIsLogProgressModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Progress for {loggingMicroSkill.name}</DialogTitle>
                    <DialogDescription>
                        Enter the progress you've made for this micro-skill.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {learningPlanForSkill?.audioVideoResources && learningPlanForSkill.audioVideoResources.length > 0 && (
                        <>
                            <div className="space-y-1">
                                <Label htmlFor="log-items">Items Completed</Label>
                                <Input id="log-items" type="number" value={progressInput.items} onChange={e => setProgressInput(p => ({...p, items: e.target.value}))} placeholder="e.g., 5" />
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="log-hours">Hours Watched/Listened</Label>
                                <Input id="log-hours" type="number" value={progressInput.hours} onChange={e => setProgressInput(p => ({...p, hours: e.target.value}))} placeholder="e.g., 2.5" />
                            </div>
                        </>
                    )}
                    {learningPlanForSkill?.bookWebpageResources && learningPlanForSkill.bookWebpageResources.length > 0 && (
                        <div className="space-y-1">
                            <Label htmlFor="log-pages">Pages Read</Label>
                            <Input id="log-pages" type="number" value={progressInput.pages} onChange={e => setProgressInput(p => ({...p, pages: e.target.value}))} placeholder="e.g., 50" />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLogProgressModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleLogProgress}>Log Progress</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
    </DndContext>
  );
}

export default function SkillPage() {
    return (
        <AuthGuard>
            <SkillPageContent />
        </AuthGuard>
    )
}
