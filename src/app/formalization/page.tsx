

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Resource, CoreSkill, ExerciseDefinition, FormalizationData, FormalizationItem, PopupState } from '@/types/workout';
import { BrainCircuit, BookCopy, ChevronRight, Folder, Link as LinkIcon, Library, Youtube, Globe, ExternalLink, MessageSquare, Code, ArrowRight, PlusCircle, Edit, Trash2, Play, Pause, GitMerge, EyeOff, Blocks, Database, Expand, X, GripVertical, Eye, ChevronsDown, ChevronsUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getAudio } from '@/lib/audioDB';
import ReactPlayer from 'react-player/youtube';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MindMapViewer } from '@/components/MindMapViewer';
import { useDraggable, DndContext, type DragEndEvent } from '@dnd-kit/core';


const getYouTubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;
        if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.pathname.startsWith('/shorts/')) {
                videoId = urlObj.pathname.split('/shorts/')[1];
            } else {
                videoId = urlObj.searchParams.get('v');
            }
        } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1);
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    } catch (e) {}
    return null;
};

const isImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    if (/\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(url)) {
        return true;
    }
    try {
        const urlObj = new URL(url);
        const imageHosts = ['images.unsplash.com', 'plus.unsplash.com', 'upload.wikimedia.org'];
        return imageHosts.includes(urlObj.hostname);
    } catch (e) {
        return false;
    }
};

const CuriosityNode = ({
    item,
    level = 0,
    onSelect,
    selectedId,
    allUpskillDefinitions,
    allResources,
    collapsedIds,
    onToggleCollapse,
}: {
    item: ExerciseDefinition;
    level?: number;
    onSelect: (item: ExerciseDefinition | Resource) => void;
    selectedId: string | null;
    allUpskillDefinitions: ExerciseDefinition[];
    allResources: Resource[];
    collapsedIds: Set<string>;
    onToggleCollapse: (id: string) => void;
}) => {
    const isExpanded = !collapsedIds.has(item.id);

    const childItems = (item.linkedUpskillIds || [])
        .map(id => allUpskillDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d);
        
    const linkedResources = (item.linkedResourceIds || [])
        .map(id => allResources.find(r => r.id === id))
        .filter((r): r is Resource => !!r);

    return (
        <div style={{ marginLeft: `${level * 16}px` }}>
            <div 
                className={cn(
                    "flex items-center gap-1 p-1 rounded-md hover:bg-muted cursor-pointer",
                    selectedId === item.id && "bg-accent"
                )}
            >
                {(childItems.length > 0 || linkedResources.length > 0) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onToggleCollapse(item.id); }}>
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                    </Button>
                )}
                <div className="flex-grow min-w-0" onClick={() => onSelect(item)}>
                    <p className="text-sm truncate" title={item.name}>{item.name}</p>
                </div>
            </div>
            {isExpanded && (
                <div className="pl-4">
                    {childItems.map(child => (
                        <CuriosityNode 
                            key={child.id}
                            item={child}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            allUpskillDefinitions={allUpskillDefinitions}
                            allResources={allResources}
                            collapsedIds={collapsedIds}
                            onToggleCollapse={onToggleCollapse}
                        />
                    ))}
                    {linkedResources.map(resource => (
                        <div
                            key={resource.id}
                            onClick={() => onSelect(resource)}
                            style={{ marginLeft: `${(level + 1) * 16}px` }}
                            className={cn(
                                "flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer text-sm truncate",
                                selectedId === resource.id && "bg-accent"
                            )}
                            title={resource.name}
                        >
                            {resource.type === 'card' ? <Library className="h-4 w-4 flex-shrink-0 text-primary" /> : <LinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                            <span className="truncate">{resource.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

type PropertyItem = { id: string; key: string; value: string };

const ItemEditorModal = ({ item, type, formalizationData, globalContext, onClose, onSave }: { 
    item: FormalizationItem | null; 
    type: 'elements' | 'operations' | 'components';
    formalizationData?: FormalizationData;
    globalContext?: FormalizationData;
    onClose: () => void; 
    onSave: (itemToSave: FormalizationItem) => void;
}) => {
    const [text, setText] = useState('');
    const [properties, setProperties] = useState<PropertyItem[]>([]);
    const [linkedElementIds, setLinkedElementIds] = useState<string[]>([]);
    const [linkedComponentIds, setLinkedComponentIds] = useState<string[]>([]);
    const [linkedOperationIds, setLinkedOperationIds] = useState<string[]>([]);
    
    useEffect(() => {
      if (item) {
        setText(item.text);
        setProperties(item.properties ? Object.entries(item.properties).map(([key, value]) => ({ id: `prop-${item.id}-${key}-${Math.random()}`, key, value: value || '' })) : []);
        setLinkedElementIds(item.linkedElementIds || []);
        setLinkedComponentIds(item.linkedComponentIds || []);
        setLinkedOperationIds(item.linkedOperationIds || []);
      }
    }, [item]);

    const handleSave = () => {
        if (!item) return;

        const updatedItem: FormalizationItem = {
            ...item,
            text,
            properties: type === 'elements' ? properties.reduce((acc, prop) => {
                if (prop.key.trim()) acc[prop.key.trim()] = prop.value;
                return acc;
            }, {} as Record<string, any>) : undefined,
            linkedElementIds: type === 'components' ? linkedElementIds : undefined,
            linkedOperationIds: type === 'elements' ? linkedOperationIds : undefined,
            linkedComponentIds: type === 'components' ? linkedComponentIds : undefined,
        };
        
        onSave(updatedItem);
    };
    
    const handlePropertyChange = (id: string, field: 'key' | 'value', newValue: string) => {
        setProperties(prev => prev.map(p => p.id === id ? { ...p, [field]: newValue } : p));
    };
    
    const handleAddProperty = () => {
        setProperties(prev => [...prev, { id: `prop_${Date.now()}_${Math.random()}`, key: '', value: '' }]);
    };

    const handleDeleteProperty = (idToDelete: string) => {
        setProperties(prev => prev.filter(p => p.id !== idToDelete));
    };
    
    const handleLinkToggle = (id: string, linkType: 'element' | 'component' | 'operation') => {
        if (linkType === 'element') {
            setLinkedElementIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else if (linkType === 'component') {
            setLinkedComponentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else if (linkType === 'operation') {
            setLinkedOperationIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const handleSelectChange = (propId: string, value: string) => {
        const newValue = value === '--none--' ? '' : value;
        handlePropertyChange(propId, 'value', newValue);
    };
    
    const getModalTitle = () => {
        if (type === 'components') return 'Edit Component';
        return `Edit ${type.slice(0, -1)}`;
    }
    
    const availableComponents = useMemo(() => {
        if (!formalizationData?.components) return [];
        return formalizationData.components.filter(c => c.id !== item?.id);
    }, [formalizationData, item]);


    return (
        <Dialog open={!!item} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{getModalTitle()}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <Textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        autoFocus
                        className="min-h-[100px]"
                        placeholder="Enter the main text or name..."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {type === 'elements' && (
                            <>
                              <div className="space-y-3">
                                  <Label>Properties</Label>
                                  <div className="space-y-2">
                                      {properties.map((prop) => (
                                          <div key={prop.id} className="flex items-center gap-2">
                                              <Input value={prop.key} onChange={(e) => handlePropertyChange(prop.id, 'key', e.target.value)} placeholder="Property Name"/>
                                              <Select onValueChange={(val) => handleSelectChange(prop.id, val)} value={prop.value || ''}>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Value or Link Component..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      <Input
                                                        className="m-2 w-[calc(100%-1rem)]"
                                                        placeholder="Type a value..."
                                                        defaultValue={prop.value}
                                                        onBlur={(e) => handlePropertyChange(prop.id, 'value', e.currentTarget.value)}
                                                      />
                                                      <SelectItem value="--none--">-- Clear --</SelectItem>
                                                      <Label className="px-2 py-1.5 text-xs font-semibold">Local Components</Label>
                                                      {availableComponents.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.text}</SelectItem>
                                                      ))}
                                                      {(globalContext?.components || []).length > 0 && <Label className="px-2 py-1.5 text-xs font-semibold">Global Components</Label>}
                                                      {(globalContext?.components || []).map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.text}</SelectItem>
                                                      ))}
                                                  </SelectContent>
                                              </Select>
                                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteProperty(prop.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                          </div>
                                      ))}
                                  </div>
                                  <Button variant="outline" size="sm" onClick={handleAddProperty}>Add Property</Button>
                              </div>
                               <div className="space-y-2">
                                    <Label>Link Operations</Label>
                                    <ScrollArea className="h-40 border rounded-md p-2">
                                        <div className="space-y-1">
                                            {(formalizationData?.operations || []).map(op => (
                                                <div key={op.id} className="flex items-center space-x-2">
                                                    <Checkbox id={`op-${op.id}`} checked={(linkedOperationIds || []).includes(op.id)} onCheckedChange={() => handleLinkToggle(op.id, 'operation')} />
                                                    <Label htmlFor={`op-${op.id}`} className="font-normal">{op.text}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </>
                        )}
                        {type === 'components' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Link Elements</Label>
                                    <ScrollArea className="h-40 border rounded-md p-2">
                                        <Label className="px-2 py-1.5 text-xs font-semibold">Local Elements</Label>
                                        <div className="space-y-1">
                                            {(formalizationData?.elements || []).map(el => (
                                                <div key={el.id} className="flex items-center space-x-2">
                                                    <Checkbox id={`el-${el.id}`} checked={(linkedElementIds || []).includes(el.id)} onCheckedChange={() => handleLinkToggle(el.id, 'element')} />
                                                    <Label htmlFor={`el-${el.id}`} className="font-normal">{el.text}</Label>
                                                </div>
                                            ))}
                                        </div>
                                        {(globalContext?.elements || []).length > 0 && <Label className="px-2 py-1.5 text-xs font-semibold">Global Elements</Label>}
                                        <div className="space-y-1">
                                            {(globalContext?.elements || []).map(el => (
                                                <div key={el.id} className="flex items-center space-x-2">
                                                    <Checkbox id={`el-${el.id}`} checked={(linkedElementIds || []).includes(el.id)} onCheckedChange={() => handleLinkToggle(el.id, 'element')} />
                                                    <Label htmlFor={`el-${el.id}`} className="font-normal">{el.text}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                                <div className="space-y-2">
                                    <Label>Link Components</Label>
                                    <ScrollArea className="h-40 border rounded-md p-2">
                                        <Label className="px-2 py-1.5 text-xs font-semibold">Local Components</Label>
                                        <div className="space-y-1">
                                            {availableComponents.map(comp => (
                                                <div key={comp.id} className="flex items-center space-x-2">
                                                    <Checkbox id={`comp-${comp.id}`} checked={(linkedComponentIds || []).includes(comp.id)} onCheckedChange={() => handleLinkToggle(comp.id, 'component')} />
                                                    <Label htmlFor={`comp-${comp.id}`} className="font-normal">{comp.text}</Label>
                                                </div>
                                            ))}
                                        </div>
                                        {(globalContext?.components || []).length > 0 && <Label className="px-2 py-1.5 text-xs font-semibold">Global Components</Label>}
                                        <div className="space-y-1">
                                            {(globalContext?.components || []).filter(c => c.id !== item?.id).map(comp => (
                                                <div key={comp.id} className="flex items-center space-x-2">
                                                    <Checkbox id={`comp-${comp.id}`} checked={(linkedComponentIds || []).includes(comp.id)} onCheckedChange={() => handleLinkToggle(comp.id, 'component')} />
                                                    <Label htmlFor={`comp-${comp.id}`} className="font-normal">{comp.text}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface ComponentPopupState {
    id: string;
    x: number;
    y: number;
}

const ComponentDetailPopup = ({ popupState, allComponentsForSpec, allElementsForSpec, allOpsForSpec, onClose, onOpenSubComponent }: { 
    popupState: ComponentPopupState;
    allComponentsForSpec: FormalizationItem[];
    allElementsForSpec: FormalizationItem[];
    allOpsForSpec: FormalizationItem[];
    onClose: (id: string) => void;
    onOpenSubComponent: (id: string, event: React.MouseEvent) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: `component-popup-${popupState.id}`,
    });
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        zIndex: 120,
    };
    
    const component = useMemo(() => {
        return allComponentsForSpec.find(c => c.id === popupState.id);
    }, [popupState.id, allComponentsForSpec]);

    const getLinkedOperations = (element: FormalizationItem) => {
        if (!allOpsForSpec || !element.linkedOperationIds) return [];
        return allOpsForSpec.filter(op => element.linkedOperationIds?.includes(op.id));
    };

    const linkedComponents = useMemo(() => {
        if (!component || !component.linkedComponentIds) return [];
        return allComponentsForSpec.filter(c => component.linkedComponentIds?.includes(c.id));
    }, [component, allComponentsForSpec]);

    const linkedElements = useMemo(() => {
        if (!component || !component.linkedElementIds) return [];
        return allElementsForSpec.filter(el => component.linkedElementIds?.includes(el.id));
    }, [component, allElementsForSpec]);
    
    if (!component) return null;

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="w-[800px] max-h-[70vh] flex flex-col shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-3 relative cursor-grab flex-shrink-0" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Blocks className="h-5 w-5 text-primary" />
                            {component.text}
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={(e) => { e.stopPropagation(); onClose(component!.id); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-4 pt-0 space-y-4">
                        {linkedComponents.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Linked Components</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {linkedComponents.map(subComponent => {
                                const subComponentElements = allElementsForSpec.filter(el => subComponent.linkedElementIds?.includes(el.id)) || [];
                                return (
                                    <Card key={subComponent.id} className="cursor-pointer hover:bg-muted/50" onClick={(e) => onOpenSubComponent(subComponent.id, e)}>
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Blocks className="h-4 w-4 text-primary" />
                                            {subComponent.text}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        {subComponentElements.length > 0 ? (
                                            <ul className="text-xs text-muted-foreground list-disc list-inside">
                                                {subComponentElements.map(el => <li key={el.id}>{el.text}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">No elements linked.</p>
                                        )}
                                    </CardContent>
                                    </Card>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {linkedElements.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Linked Elements</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {linkedElements.map(el => (
                                        <Card key={el.id}>
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                <Database className="h-4 w-4 text-primary" />
                                                {el.text}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0 space-y-2">
                                                {el.properties && Object.keys(el.properties).length > 0 && (
                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        <p className="font-medium text-foreground">Properties:</p>
                                                        <ul className="list-disc list-inside">
                                                            {Object.entries(el.properties).map(([key, value]) => {
                                                                const linkedComp = allComponentsForSpec.find(c => c.id === value);
                                                                return (
                                                                <li key={key}>
                                                                    <span className="font-semibold">{key}:</span>{' '}
                                                                    {linkedComp ? (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="cursor-pointer hover:ring-1 hover:ring-primary"
                                                                            onClick={(e) => onOpenSubComponent(linkedComp.id, e)}
                                                                        >
                                                                            {linkedComp.text}
                                                                        </Badge>
                                                                    ) : (
                                                                        value
                                                                    )}
                                                                </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                )}
                                                {getLinkedOperations(el).length > 0 && (
                                                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                                                        <p className="font-medium text-foreground">Operations:</p>
                                                        <ul className="list-disc list-inside">
                                                            {getLinkedOperations(el).map(op => (
                                                                <li key={op.id}>{op.text}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                        {linkedElements.length === 0 && linkedComponents.length === 0 && (
                        <p className="text-muted-foreground text-center">No elements or components linked to this component.</p>
                        )}
                    </CardContent>
                </div>
            </Card>
        </div>
    );
};

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

function FormalizationPageContent() {
    const { 
        resources, 
        setResources, 
        coreSkills, 
        upskillDefinitions, 
        openGeneralPopup, 
        globalVolume,
        selectedFormalizationSpecId,
        setSelectedFormalizationSpecId,
        offerizationPlans,
    } = useAuth();
    const { toast } = useToast();
    
    const [selectedResource, setSelectedResource] = useState<Resource | ExerciseDefinition | null>(null);
    const [collapsedCuriosities, setCollapsedCuriosities] = useState<Set<string>>(new Set());

    const [editingItem, setEditingItem] = useState<{item: FormalizationItem, type: 'elements' | 'operations' | 'components'} | null>(null);

    const [playingAudio, setPlayingAudio] = useState(false);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playerRef = useRef<ReactPlayer>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
    const [mindMapRootId, setMindMapRootId] = useState<string | null>(null);
    const [componentPopups, setComponentPopups] = useState<Map<string, ComponentPopupState>>(new Map());
    const [hideLinked, setHideLinked] = useState<Record<'elements' | 'operations' | 'components', boolean>>({ elements: true, operations: true, components: true });

    const specializations = useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization' && offerizationPlans && offerizationPlans[skill.id]);
    }, [coreSkills, offerizationPlans]);

    const getSpecResources = useCallback((specId: string | null): Resource[] => {
        if (!specId) return [];
        const spec = specializations.find(s => s.id === specId);
        if (!spec) return [];
        
        const microSkillNames = new Set(spec.skillAreas.flatMap(sa => sa.microSkills.map(ms => ms.name)));
        const curiositiesInSpec = upskillDefinitions.filter(def => microSkillNames.has(def.category));
        
        const resourcesInSpec: Resource[] = [];
        const visitedResourceIds = new Set<string>();
        const queue = [...curiositiesInSpec];

        while (queue.length > 0) {
            const current = queue.shift()!;
            (current.linkedResourceIds || []).forEach(resId => {
                if (!visitedResourceIds.has(resId)) {
                    const resource = resources.find(r => r.id === resId);
                    if (resource) {
                        resourcesInSpec.push(resource);
                        visitedResourceIds.add(resId);
                    }
                }
            });
            (current.linkedUpskillIds || []).forEach(childId => {
                const childDef = upskillDefinitions.find(d => d.id === childId);
                if (childDef) queue.push(childDef);
            });
        }
        return resourcesInSpec;
    }, [specializations, upskillDefinitions, resources]);

    const curiositiesForSpecialization = useMemo(() => {
        if (!selectedFormalizationSpecId) return [];
        const spec = coreSkills.find(s => s.id === selectedFormalizationSpecId);
        if (!spec) return [];
        
        const microSkillNames = new Set(spec.skillAreas.flatMap(sa => sa.microSkills.map(ms => ms.name)));
        
        const allChildIds = new Set(
            upskillDefinitions.flatMap(def => def.linkedUpskillIds || [])
        );

        return upskillDefinitions.filter(def => 
            microSkillNames.has(def.category) && !allChildIds.has(def.id)
        );
    }, [selectedFormalizationSpecId, coreSkills, upskillDefinitions]);

    const isResource = (item: any): item is Resource => item && 'folderId' in item;
    
    useEffect(() => {
        if (editingItem && playingAudio) {
            audioRef.current?.pause();
            setPlayingAudio(false);
        }
    }, [editingItem, playingAudio]);
    
    useEffect(() => {
        if (selectedResource && isResource(selectedResource)) {
            const updatedResource = resources.find(r => r.id === selectedResource.id);
            if (updatedResource && JSON.stringify(selectedResource) !== JSON.stringify(updatedResource)) {
                setSelectedResource(updatedResource);
            }
        }
    }, [resources, selectedResource]);

    useEffect(() => {
        if (selectedResource && isResource(selectedResource)) {
            let objectUrl: string | null = null;
            const loadAudio = async () => {
                if (selectedResource.hasLocalAudio && selectedResource.id) {
                    try {
                        const audioBlob = await getAudio(selectedResource.id);
                        if (audioBlob) {
                            objectUrl = URL.createObjectURL(audioBlob);
                            setAudioSrc(objectUrl);
                        } else {
                            setAudioSrc(null);
                        }
                    } catch (error) {
                        console.error("Failed to load audio:", error);
                        setAudioSrc(null);
                    }
                } else {
                    setAudioSrc(null);
                }
            };
            loadAudio();

            return () => {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                setPlayingAudio(false);
            };
        }
    }, [selectedResource]);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;
        
        const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime);
        const handleDurationChange = () => setDuration(audioEl.duration);

        audioEl.addEventListener('timeupdate', handleTimeUpdate);
        audioEl.addEventListener('durationchange', handleDurationChange);

        return () => {
            if (audioEl) {
                audioEl.removeEventListener('timeupdate', handleTimeUpdate);
                audioEl.removeEventListener('durationchange', handleDurationChange);
            }
        };
    }, []);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl || !audioSrc) return;
        if (audioEl.src !== audioSrc) audioEl.src = audioSrc;

        if (playingAudio) {
            audioEl.volume = globalVolume;
            audioEl.play().catch(e => console.error("Audio play failed:", e));
        } else {
            audioEl.pause();
        }
    }, [playingAudio, audioSrc, globalVolume]);

    
    const handleSeekTo = (timestamp: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = timestamp;
            if (audioRef.current.paused) {
                setPlayingAudio(true);
            }
        }
        if (playerRef.current) {
            playerRef.current.seekTo(timestamp, 'seconds');
            setPlayingAudio(true);
        }
    };
    
    const updateResourceFormalization = (resourceId: string, updatedFormalization: FormalizationData) => {
      setResources(prevResources =>
        prevResources.map(res =>
          res.id === resourceId
            ? { ...res, formalization: updatedFormalization }
            : res
        )
      );
    };

    const handleAddItem = (type: 'elements' | 'operations' | 'components') => {
        if (!selectedResource || !isResource(selectedResource)) return;
        const newItem: FormalizationItem = { id: `item_${Date.now()}`, text: `New ${type.slice(0, -1)}` };
        
        const currentFormalization = selectedResource.formalization || { elements: [], operations: [], components: [] };
        const updatedItems = [...(currentFormalization[type] || []), newItem];
        
        updateResourceFormalization(selectedResource.id, { ...currentFormalization, [type]: updatedItems });
        setEditingItem({ item: newItem, type });
    };
    
    const handleUpdateItem = (itemToSave: FormalizationItem) => {
        if (!selectedResource || !isResource(selectedResource)) return;
        
        const type = editingItem!.type;
        const currentFormalization = selectedResource.formalization || { elements: [], operations: [], components: [] };
        
        const updatedItems = (currentFormalization[type] || []).map(item =>
            item.id === itemToSave.id ? itemToSave : item
        );
        
        updateResourceFormalization(selectedResource.id, { ...currentFormalization, [type]: updatedItems });
        setEditingItem(null);
    };

    const handleDeleteItem = (type: 'elements' | 'operations' | 'components', id: string) => {
        if (!selectedResource || !isResource(selectedResource)) return;
        const currentFormalization = selectedResource.formalization || { elements: [], operations: [], components: [] };
        const updatedItems = (currentFormalization[type] || []).filter(item => item.id !== id);
        
        let finalFormalization: FormalizationData = { ...currentFormalization, [type]: updatedItems };

        if (type === 'elements') {
             finalFormalization.components = (finalFormalization.components || []).map(p => ({
                ...p,
                linkedElementIds: (p.linkedElementIds || []).filter(elId => elId !== id)
            }));
        } else if (type === 'operations') {
            finalFormalization.elements = (finalFormalization.elements || []).map(el => ({
                ...el,
                linkedOperationIds: (el.linkedOperationIds || []).filter(opId => opId !== id)
            }));
        } else if (type === 'components') {
            finalFormalization.elements = (finalFormalization.elements || []).map(el => {
                const newProps = { ...el.properties };
                let changed = false;
                Object.entries(newProps).forEach(([key, value]) => {
                    if (value === id) {
                        delete newProps[key];
                        changed = true;
                    }
                });
                return changed ? { ...el, properties: newProps } : el;
            });
            finalFormalization.components = (finalFormalization.components || []).map(comp => ({
                ...comp,
                linkedComponentIds: (comp.linkedComponentIds || []).filter(cId => cId !== id)
            }));
        }
        
        updateResourceFormalization(selectedResource.id, finalFormalization);
    };
    
    const openMindMapForElement = (elementId: string) => {
        setMindMapRootId(elementId);
        setIsMindMapModalOpen(true);
    };

    const handleToggleGlobal = (elementId: string) => {
        let isNowGlobal = false;
        const allResourcesToUpdate = resources.map(res => {
            if (res.formalization && res.formalization.elements) {
                let elementFound = false;
                const updatedElements = res.formalization.elements.map(el => {
                    if (el.id === elementId) {
                        elementFound = true;
                        isNowGlobal = !el.isGlobal;
                        return { ...el, isGlobal: isNowGlobal };
                    }
                    return el;
                });
                if (elementFound) {
                    return { ...res, formalization: { ...res.formalization, elements: updatedElements }};
                }
            }
            return res;
        });
        setResources(allResourcesToUpdate);

        if (isNowGlobal) {
            const element = allResourcesToUpdate.flatMap(r => r.formalization?.elements || []).find(el => el.id === elementId);
            if (element) {
                openComponentHierarchyFromElement(element);
            }
        }
    };
    
    const allComponentsForSpec = useMemo(() => {
        const specResources = getSpecResources(selectedFormalizationSpecId);
        return specResources.flatMap(r => r.formalization?.components || []);
    }, [selectedFormalizationSpecId, getSpecResources]);

    const allElementsForSpec = useMemo(() => {
        const specResources = getSpecResources(selectedFormalizationSpecId);
        return specResources.flatMap(r => r.formalization?.elements || []);
    }, [selectedFormalizationSpecId, getSpecResources]);

    const allOpsForSpec = useMemo(() => {
        const specResources = getSpecResources(selectedFormalizationSpecId);
        return specResources.flatMap(r => r.formalization?.operations || []);
    }, [selectedFormalizationSpecId, getSpecResources]);

    const openComponentHierarchyFromElement = (element: FormalizationItem) => {
        if (!element.properties) return;
        let xOffset = 0;

        const openRecursive = (componentId: string, level = 0, parentX = window.innerWidth / 2, parentY = window.innerHeight / 2) => {
            const component = allComponentsForSpec.find(c => c.id === componentId);
            if (!component) return;

            const posX = parentX + 200 * level + xOffset;
            const posY = parentY + 50 * level;
            
            openGeneralPopup(componentId, { clientX: posX, clientY: posY } as React.MouseEvent);

            const linkedElements = allElementsForSpec.filter(el => component.linkedElementIds?.includes(el.id));
            linkedElements.forEach(el => {
                if (el.properties) {
                    Object.values(el.properties).forEach(propValue => {
                        const isComponentLink = allComponentsForSpec.some(c => c.id === propValue);
                        if (isComponentLink) {
                            openRecursive(propValue, level + 1, posX, posY);
                        }
                    });
                }
            });
            xOffset += 450;
        };

        const topLevelComponents = Object.values(element.properties).filter(val => allComponentsForSpec.some(c => c.id === val));
        topLevelComponents.forEach(componentId => {
            openRecursive(componentId);
        });
    };
      
    const fullFormalizationData = useMemo(() => {
      const specResources = getSpecResources(selectedFormalizationSpecId);
  
      // All items defined within the current specialization
      const allSpecFormalization = specResources.reduce((acc, res) => {
        if (res.formalization) {
          acc.elements.push(...res.formalization.elements);
          acc.operations.push(...res.formalization.operations);
          acc.components.push(...res.formalization.components);
        }
        return acc;
      }, { elements: [] as FormalizationItem[], operations: [] as FormalizationItem[], components: [] as FormalizationItem[] });
      
      const uniqueItems = (items: FormalizationItem[]) => Array.from(new Map(items.map(item => [item.id, item])).values());
  
      return {
        elements: uniqueItems(allSpecFormalization.elements),
        operations: uniqueItems(allSpecFormalization.operations),
        components: uniqueItems(allSpecFormalization.components),
      };
    }, [selectedFormalizationSpecId, getSpecResources]);

    const globalContextData = useMemo(() => {
        const specResources = getSpecResources(selectedFormalizationSpecId);

        // Global elements are those explicitly marked as global from ANY resource in the spec
        const globalElements = specResources
            .flatMap(res => res.formalization?.elements || [])
            .filter(el => el.isGlobal);

        // Global components are those reachable from global elements
        const allCompsMap = new Map<string, FormalizationItem>();
        specResources.forEach(r => {
            (r.formalization?.components || []).forEach(c => allCompsMap.set(c.id, c));
        });
        
        const globalComponentsSet = new Set<FormalizationItem>();
        const queue = globalElements.flatMap(el => Object.values(el.properties || {})).filter(id => allCompsMap.has(id));
        const visited = new Set<string>(queue);

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const component = allCompsMap.get(currentId);
            if (component) {
                globalComponentsSet.add(component);
                (component.linkedComponentIds || []).forEach(childId => {
                    if (!visited.has(childId)) {
                        queue.push(childId);
                        visited.add(childId);
                    }
                });
            }
        }
        
        return {
            elements: globalElements,
            components: Array.from(globalComponentsSet),
            operations: [], // Operations are not considered global in this context
        };
    }, [selectedFormalizationSpecId, getSpecResources]);

    const { itemsToDisplay, encapsulatedIds } = useMemo(() => {
        const localData = (isResource(selectedResource) && selectedResource?.formalization)
            ? selectedResource.formalization
            : { elements: [], operations: [], components: [] };
    
        const localItemIds = {
            elements: new Set(localData.elements.map(e => e.id)),
            operations: new Set(localData.operations.map(o => o.id)),
            components: new Set(localData.components.map(c => c.id)),
        };
    
        const getVisibleLinkedItems = (startItems: FormalizationItem[]): FormalizationItem[] => {
            const visible = new Set<string>(startItems.map(i => i.id));
            const queue = [...startItems];
            const visited = new Set<string>(startItems.map(i => i.id));
    
            while (queue.length > 0) {
                const current = queue.shift()!;
                const allChildIds = [
                    ...(current.linkedElementIds || []),
                    ...(current.linkedComponentIds || []),
                    ...(current.linkedOperationIds || []),
                    ...(Object.values(current.properties || {})),
                ];
    
                allChildIds.forEach(childId => {
                    if (!visited.has(childId)) {
                        visited.add(childId);
                        const childItem = fullFormalizationData.elements.find(i => i.id === childId) ||
                                          fullFormalizationData.components.find(i => i.id === childId) ||
                                          fullFormalizationData.operations.find(i => i.id === childId);
                        if (childItem) {
                            visible.add(childId);
                            queue.push(childItem);
                        }
                    }
                });
            }
            return [
                ...fullFormalizationData.elements,
                ...fullFormalizationData.operations,
                ...fullFormalizationData.components,
            ].filter(item => visible.has(item.id));
        };
    
        const baseVisibleItems = [
            ...localData.elements,
            ...localData.operations,
            ...localData.components,
            ...globalContextData.elements,
        ];
        
        const allVisibleItems = getVisibleLinkedItems(baseVisibleItems);
        
        const finalItems = {
            elements: allVisibleItems.filter(item => fullFormalizationData.elements.some(e => e.id === item.id)),
            operations: allVisibleItems.filter(item => fullFormalizationData.operations.some(o => o.id === item.id)),
            components: allVisibleItems.filter(item => fullFormalizationData.components.some(c => c.id === item.id)),
        };

        const encapsulated = new Set<string>();
        Object.values(finalItems).flat().forEach(item => {
            if (!localItemIds.elements.has(item.id) && !localItemIds.operations.has(item.id) && !localItemIds.components.has(item.id) && !item.isGlobal) {
                encapsulated.add(item.id);
            }
        });

        const filterByType = (items: FormalizationItem[], type: 'elements' | 'operations' | 'components') => {
            if (hideLinked[type]) {
                return items.filter(item => localItemIds[type].has(item.id) || item.isGlobal);
            }
            return items;
        };

        return {
            itemsToDisplay: {
                elements: filterByType(finalItems.elements, 'elements'),
                operations: filterByType(finalItems.operations, 'operations'),
                components: filterByType(finalItems.components, 'components'),
            },
            encapsulatedIds: encapsulated,
        };
    }, [selectedResource, fullFormalizationData, globalContextData, hideLinked]);


    const handleToggleCollapseAll = () => {
        const allIds = new Set(curiositiesForSpecialization.map(c => c.id));
        if (collapsedCuriosities.size === allIds.size) {
            setCollapsedCuriosities(new Set());
        } else {
            setCollapsedCuriosities(allIds);
        }
    };
    
    const renderSelectedResource = () => {
        if (!selectedResource) {
            return (
                <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Select an item from the sidebar</p>
                </div>
            );
        }
        
        if (isResource(selectedResource)) {
            const youtubeEmbedUrl = getYouTubeEmbedUrl(selectedResource.link);
            const imageEmbedUrl = isImageUrl(selectedResource.link) ? selectedResource.link : null;

            return (
                <Card className="h-full flex flex-col relative group">
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openGeneralPopup(selectedResource.id, e)}>
                        <Expand className="h-4 w-4" />
                      </Button>
                    </div>
                    {(audioSrc || youtubeEmbedUrl) && (
                        <div className="p-3 border-b">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPlayingAudio(p => !p)}>
                                    {playingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>
                                <span className="text-xs font-mono">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={(e) => {
                                        const newTime = parseFloat(e.target.value);
                                        setCurrentTime(newTime);
                                        if (audioRef.current) audioRef.current.currentTime = newTime;
                                        if (playerRef.current) playerRef.current.seekTo(newTime, 'seconds');
                                    }}
                                    className="w-full"
                                />
                                <span className="text-xs font-mono">{formatTime(duration)}</span>
                            </div>
                        </div>
                    )}
                    {youtubeEmbedUrl ? (
                         <div className="aspect-video w-full bg-black rounded-t-lg">
                            <ReactPlayer
                                ref={playerRef}
                                url={selectedResource.link!}
                                width="100%"
                                height="100%"
                                playing={playingAudio}
                                controls={true}
                                volume={globalVolume}
                                onProgress={(state) => setCurrentTime(state.playedSeconds)}
                                onDuration={setDuration}
                            />
                        </div>
                    ) : imageEmbedUrl ? (
                         <div className="aspect-video w-full bg-black relative rounded-t-lg">
                            <Image src={imageEmbedUrl} alt={selectedResource.name} layout="fill" objectFit="contain" />
                        </div>
                    ) : null }
                    <CardHeader>
                        <CardTitle className="truncate" title={selectedResource.name}>
                            <div className="flex items-center gap-2">
                                {selectedResource.type === 'card' ? <Library className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                                {selectedResource.name}
                            </div>
                        </CardTitle>
                        {selectedResource.link && (
                             <CardDescription className="flex items-center gap-2 text-xs">
                                <a href={selectedResource.link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{selectedResource.link}</a>
                                <a href={selectedResource.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3"/></a>
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow min-h-0">
                         <ScrollArea className="h-full">
                            {selectedResource.type === 'card' && selectedResource.points && (
                                <ul className="space-y-3 pr-3">
                                    {(selectedResource.points || []).map((point) => (
                                        <li key={point.id} className="flex items-start gap-3 text-sm text-muted-foreground group/item">
                                            {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> : 
                                             point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> : 
                                             point.type === 'timestamp' ? (
                                                <button onClick={() => handleSeekTo(point.timestamp || 0)} className="font-mono text-primary font-semibold mt-0.5 flex-shrink-0">
                                                    {formatTime(point.timestamp || 0)}
                                                </button>
                                             ) :
                                             <ArrowRight className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />}
                                             
                                            {point.type === 'card' && point.resourceId ? (
                                                <button
                                                    onClick={(e) => openGeneralPopup(point.resourceId!, e)}
                                                    className="text-left font-medium text-primary hover:underline"
                                                >
                                                    {point.text}
                                                </button>
                                            ) : point.type === 'markdown' ? (
                                                <div className="w-full prose dark:prose-invert prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown></div>
                                            ) : point.type === 'code' ? (
                                                <div className="w-full text-xs">
                                                    <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '0.5rem', borderRadius: '0.375rem', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} codeTagProps={{style: {fontSize: '0.8rem', fontFamily: 'monospace'}}}>
                                                        {point.text || ""}
                                                    </SyntaxHighlighter>
                                                </div>
                                            ) : (<span className="break-words w-full" title={point.text}>{point.text}</span>)}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {selectedResource.description && selectedResource.type !== 'card' && <p className="text-sm text-muted-foreground">{selectedResource.description}</p>}
                         </ScrollArea>
                    </CardContent>
                </Card>
            );
        }

        return (
             <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="truncate" title={selectedResource.name}>{selectedResource.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{selectedResource.description || "No description."}</p>
                </CardContent>
            </Card>
        );
    };
    
    const renderFormalizationSection = (type: 'elements' | 'operations' | 'components', title: string, description: string) => {
        const data: FormalizationItem[] = (itemsToDisplay?.[type] || []);
        
        return (
            <div className="h-full flex flex-col">
                <Card className="flex flex-col h-full">
                    <CardHeader className="flex flex-row items-center justify-between p-4 flex-shrink-0">
                        <div>
                            <CardTitle className="capitalize">{title}</CardTitle>
                            <CardDescription className="text-xs">{description}</CardDescription>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHideLinked(prev => ({...prev, [type]: !prev[type]}))}>
                                {hideLinked[type] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-primary" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddItem(type)} disabled={!isResource(selectedResource)}>
                                <PlusCircle className="h-4 w-4 text-green-500"/>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow min-h-0">
                        <ScrollArea className="h-full">
                            <div className="space-y-2 p-4 pt-0">
                                {data.map(item => {
                                    const linkedOperations = (item.linkedOperationIds || []).map(id => fullFormalizationData?.operations?.find(op => op.id === id)?.text).filter(Boolean);
                                    const linkedElements = (item.linkedElementIds || []).map(id => fullFormalizationData?.elements?.find(el => el.id === id)?.text).filter(Boolean);
                                    const linkedComponents = (item.linkedComponentIds || []).map(id => fullFormalizationData?.components?.find(c => c.id === id)?.text).filter(Boolean);
                                    
                                    return (
                                    <Card key={item.id} className="group relative">
                                        <CardContent className="p-3 text-sm">
                                            <div className="flex items-center justify-between">
                                                <button className="font-semibold text-left w-full" onClick={(e) => type === 'components' && openComponentPopup(item.id, e)}>{item.text}</button>
                                                {item.isGlobal && <Globe className="h-4 w-4 text-blue-500"/>}
                                            </div>
                                            {type === 'elements' && item.properties && Object.keys(item.properties).length > 0 && (
                                                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                                                    {Object.entries(item.properties).map(([key, value]) => {
                                                        const component = fullFormalizationData?.components?.find(p => p.id === value);
                                                        return (
                                                            <div key={key} className="flex items-center gap-2">
                                                                <span className="font-medium text-foreground">{key}:</span>
                                                                {component ? (
                                                                    <Badge
                                                                    variant="secondary"
                                                                    className="cursor-pointer hover:ring-1 hover:ring-primary"
                                                                    onClick={(e) => openComponentPopup(component.id, e)}
                                                                    >
                                                                    {component.text}
                                                                    </Badge>
                                                                ) : (
                                                                    String(value)
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {type === 'elements' && linkedOperations.length > 0 && (
                                                <div className="mt-2 pt-2 border-t">
                                                    <h5 className="font-medium text-xs text-muted-foreground">Operations:</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {linkedOperations.map((op, i) => <Badge key={i} variant="secondary">{op}</Badge>)}
                                                    </div>
                                                </div>
                                            )}
                                            {type === 'components' && linkedElements.length > 0 && (
                                                <div className="mt-2 pt-2 border-t">
                                                    <h5 className="font-medium text-xs text-muted-foreground">Elements:</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {linkedElements.map((el, i) => <Badge key={i} variant="secondary">{el}</Badge>)}
                                                    </div>
                                                </div>
                                            )}
                                            {type === 'components' && linkedComponents.length > 0 && (
                                                <div className="mt-2 pt-2 border-t">
                                                    <h5 className="font-medium text-xs text-muted-foreground">Components:</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {linkedComponents.map((comp, i) => <Badge key={i} variant="outline">{comp}</Badge>)}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                        <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {type === 'elements' && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleGlobal(item.id)}>
                                                <Globe className={cn("h-4 w-4", item.isGlobal && "text-blue-500")} />
                                            </Button>
                                            )}
                                            {type === 'elements' && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMindMapForElement(item.id)}>
                                                <GitMerge className="h-4 w-4" />
                                            </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem({ item, type })}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(type, item.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </Card>
                                )})}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const openComponentPopup = useCallback((componentId: string, event: React.MouseEvent) => {
        setComponentPopups(prev => {
            const newPopups = new Map(prev);
            const parentRect = (event.target as HTMLElement).closest('[data-popup-id]')?.getBoundingClientRect();
            
            const newPopup: ComponentPopupState = {
                id: componentId,
                x: parentRect ? parentRect.right + 10 : event.clientX,
                y: parentRect ? parentRect.top : event.clientY,
            };
            newPopups.set(componentId, newPopup);
            return newPopups;
        });
    }, []);

    const closeComponentPopup = useCallback((componentId: string) => {
        setComponentPopups(prev => {
            const newPopups = new Map(prev);
            newPopups.delete(componentId);
            return newPopups;
        });
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, delta } = event;
        const activeId = active.id as string;
    
        if (activeId.startsWith('component-popup-')) {
          const componentId = activeId.replace('component-popup-', '');
          setComponentPopups(prev => {
            const newPopups = new Map(prev);
            const popup = newPopups.get(componentId);
            if (popup) {
              newPopups.set(componentId, {
                ...popup,
                x: popup.x + delta.x,
                y: popup.y + delta.y,
              });
            }
            return newPopups;
          });
        }
      }, []);

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <audio ref={audioRef} onEnded={() => setPlayingAudio(false)} className="hidden" />
            <div className="h-[calc(100vh-4rem-1px)] flex flex-col">
                <header className="flex-shrink-0 p-4 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Formalization</h1>
                            <p className="text-muted-foreground">Deconstruct knowledge into its fundamental building blocks.</p>
                        </div>
                        <Select value={selectedFormalizationSpecId || ''} onValueChange={setSelectedFormalizationSpecId}>
                            <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select Specialization..." /></SelectTrigger>
                            <SelectContent>
                                {specializations.map(spec => (
                                    <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 flex-grow min-h-0">
                    <Card className="lg:col-span-1 flex flex-col min-h-0">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2"><BookCopy/> Curiosities</CardTitle>
                                <div className="flex">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsedCuriosities(new Set(curiositiesForSpecialization.map(c => c.id)))}>
                                        <ChevronsUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsedCuriosities(new Set())}>
                                        <ChevronsDown className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow min-h-0 flex flex-col gap-4">
                            <ScrollArea className="flex-grow">
                                <div className="space-y-1">
                                    {curiositiesForSpecialization.map(curiosity => (
                                        <CuriosityNode 
                                            key={curiosity.id}
                                            item={curiosity}
                                            onSelect={setSelectedResource}
                                            selectedId={selectedResource?.id || null}
                                            allUpskillDefinitions={upskillDefinitions}
                                            allResources={resources}
                                            collapsedIds={collapsedCuriosities}
                                            onToggleCollapse={(id) => setCollapsedCuriosities(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                                                return newSet;
                                            })}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-4 flex-grow min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-1 h-full min-h-0">
                            {renderSelectedResource()}
                        </div>
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
                            {renderFormalizationSection('elements', 'Elements', 'Atomic concepts, formulas, code snippets.')}
                            {renderFormalizationSection('operations', 'Operations', 'How elements interact; inputs and outputs.')}
                            {renderFormalizationSection('components', 'Components', 'Reusable templates of elements.')}
                        </div>
                    </div>
                </div>
            </div>
            {editingItem && (
                <ItemEditorModal
                    item={editingItem.item}
                    type={editingItem.type}
                    formalizationData={fullFormalizationData}
                    globalContext={globalContextData}
                    onClose={() => setEditingItem(null)}
                    onSave={handleUpdateItem}
                />
            )}
             {Array.from(componentPopups.values()).map(popupState => (
                <ComponentDetailPopup
                    key={popupState.id}
                    popupState={popupState}
                    allComponentsForSpec={allComponentsForSpec}
                    allElementsForSpec={allElementsForSpec}
                    allOpsForSpec={allOpsForSpec}
                    onClose={closeComponentPopup}
                    onOpenSubComponent={(id, e) => openComponentPopup(id, e)}
                />
            ))}
            <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
              <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                <DialogHeader className="p-4 border-b">
                  <DialogTitle>Mind Map</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                  <MindMapViewer showControls={false} rootId={mindMapRootId} />
                </div>
              </DialogContent>
            </Dialog>
        </DndContext>
    );
}

export default function FormalizationPage() {
    return (
        <AuthGuard>
            <FormalizationPageContent />
        </AuthGuard>
    );
}







    







    

    
