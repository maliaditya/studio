

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Resource, CoreSkill, ExerciseDefinition, FormalizationData, FormalizationItem } from '@/types/workout';
import { BrainCircuit, BookCopy, ChevronRight, Folder, Link as LinkIcon, Library, Youtube, Globe, ExternalLink, MessageSquare, Code, ArrowRight, PlusCircle, Edit, Trash2, Play, Pause, GitMerge, EyeOff } from 'lucide-react';
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

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const CuriosityNode = ({
    item,
    level = 0,
    onSelect,
    selectedId,
    allUpskillDefinitions,
    allResources,
}: {
    item: ExerciseDefinition;
    level?: number;
    onSelect: (item: ExerciseDefinition | Resource) => void;
    selectedId: string | null;
    allUpskillDefinitions: ExerciseDefinition[];
    allResources: Resource[];
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

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
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
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

const ItemEditorModal = ({ item, type, formalizationData, onClose, onSave }: { 
    item: FormalizationItem | null; 
    type: 'elements' | 'operations' | 'components';
    formalizationData?: FormalizationData;
    onClose: () => void; 
    onSave: (itemToSave: FormalizationItem) => void;
}) => {
    const [text, setText] = useState('');
    const [properties, setProperties] = useState<PropertyItem[]>([]);
    const [linkedElementIds, setLinkedElementIds] = useState<string[]>([]);
    const [linkedComponentIds, setLinkedComponentIds] = useState<string[]>([]);
    
    useEffect(() => {
      if (item) {
        setText(item.text);
        if (type === 'elements' && item.properties) {
          setProperties(Object.entries(item.properties).map(([key, value]) => ({ id: `prop-${item.id}-${key}-${Math.random()}`, key, value: value || '' })));
        } else {
          setProperties([]);
        }
        if (type === 'operations' || type === 'components') {
            setLinkedElementIds(item.linkedElementIds || []);
        } else {
            setLinkedElementIds([]);
        }
        if (type === 'components') {
            setLinkedComponentIds(item.linkedComponentIds || []);
        } else {
            setLinkedComponentIds([]);
        }
      }
    }, [item, type]);

    const handleSave = () => {
        if (!item) return;

        const updatedItem: FormalizationItem = {
            ...item,
            text,
            properties: type === 'elements' ? properties.reduce((acc, prop) => {
                if (prop.key.trim()) acc[prop.key.trim()] = prop.value;
                return acc;
            }, {} as Record<string, any>) : undefined,
            linkedElementIds: (type === 'operations' || type === 'components') ? linkedElementIds : undefined,
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
    
    const handleLinkToggle = (id: string, linkType: 'element' | 'component') => {
        if (linkType === 'element') {
            setLinkedElementIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setLinkedComponentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
      
      const findDescendants = (compId: string, allComps: FormalizationItem[]): string[] => {
          let children: string[] = [];
          const comp = allComps.find(c => c.id === compId);
          if (comp && comp.linkedComponentIds) {
              children = [...comp.linkedComponentIds];
              comp.linkedComponentIds.forEach(childId => {
                  children = [...children, ...findDescendants(childId, allComps)];
              });
          }
          return children;
      };

      const selfAndDescendants = item ? [item.id, ...findDescendants(item.id, formalizationData.components)] : [];

      return formalizationData.components.filter(c => !selfAndDescendants.includes(c.id));
    }, [formalizationData, item]);


    return (
        <Dialog open={!!item} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-xl">
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
                    {type === 'elements' && (
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
                                                {availableComponents.map(p => (
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
                    )}
                    {(type === 'operations' || type === 'components') && (
                        <div className="space-y-2">
                            <Label>Link Elements</Label>
                            <ScrollArea className="h-40 border rounded-md p-2">
                                <div className="space-y-1">
                                    {(formalizationData?.elements || []).map(el => (
                                        <div key={el.id} className="flex items-center space-x-2">
                                            <Checkbox id={`el-${el.id}`} checked={linkedElementIds.includes(el.id)} onCheckedChange={() => handleLinkToggle(el.id, 'element')} />
                                            <Label htmlFor={`el-${el.id}`} className="font-normal">{el.text}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                    {type === 'components' && (
                        <div className="space-y-2">
                            <Label>Link Components</Label>
                            <ScrollArea className="h-40 border rounded-md p-2">
                                <div className="space-y-1">
                                    {availableComponents.map(comp => (
                                        <div key={comp.id} className="flex items-center space-x-2">
                                            <Checkbox id={`comp-${comp.id}`} checked={linkedComponentIds.includes(comp.id)} onCheckedChange={() => handleLinkToggle(comp.id, 'component')} />
                                            <Label htmlFor={`comp-${comp.id}`} className="font-normal">{comp.text}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ComponentDetailPopup = ({ componentId, formalizationData, onClose, onOpenSubComponent }: {
    componentId: string | null;
    formalizationData?: FormalizationData;
    onClose: () => void;
    onOpenSubComponent: (id: string) => void;
}) => {
    const component = useMemo(() => {
        return formalizationData?.components?.find(c => c.id === componentId);
    }, [componentId, formalizationData]);

    const linkedElements = useMemo(() => {
        if (!component || !component.linkedElementIds || !formalizationData?.elements) return [];
        return formalizationData.elements.filter(el => component.linkedElementIds?.includes(el.id));
    }, [component, formalizationData]);
    
    const linkedComponents = useMemo(() => {
      if (!component || !component.linkedComponentIds || !formalizationData?.components) return [];
      return formalizationData.components.filter(c => component.linkedComponentIds?.includes(c.id));
    }, [component, formalizationData]);

    const getLinkedOperations = (elementId: string) => {
        if (!formalizationData?.operations) return [];
        return formalizationData.operations.filter(op => op.linkedElementIds?.includes(elementId));
    };
    
    if (!component) return null;

    return (
        <Dialog open={!!componentId} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Component: {component.text}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {linkedComponents.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Linked Components</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {linkedComponents.map(c => (
                            <Card key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpenSubComponent(c.id)}>
                              <CardHeader className="p-4">
                                <CardTitle className="text-base">Component: {c.text}</CardTitle>
                              </CardHeader>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {linkedElements.map(el => (
                            <Card key={el.id}>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base">Element: {el.text}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-2">
                                    {el.properties && Object.keys(el.properties).length > 0 && (
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <p className="font-medium text-foreground">Properties:</p>
                                            <ul className="list-disc list-inside">
                                                {Object.entries(el.properties).map(([key, value]) => {
                                                    const linkedComp = formalizationData?.components?.find(c => c.id === value);
                                                    return (
                                                      <li key={key}>
                                                          <span className="font-semibold">{key}:</span>{' '}
                                                          {linkedComp ? (
                                                              <Badge
                                                                  variant="secondary"
                                                                  className="cursor-pointer hover:ring-1 hover:ring-primary"
                                                                  onClick={() => onOpenSubComponent(linkedComp.id)}
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
                                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                                        <p className="font-medium text-foreground">Operations:</p>
                                        <ul className="list-disc list-inside">
                                            {getLinkedOperations(el.id).map(op => (
                                                <li key={op.id}>{op.text}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {linkedElements.length === 0 && linkedComponents.length === 0 && (
                      <p className="text-muted-foreground text-center">No elements or components linked to this component.</p>
                    )}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
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
    } = useAuth();
    const { toast } = useToast();
    
    const [selectedResource, setSelectedResource] = useState<Resource | ExerciseDefinition | null>(null);

    const [editingItem, setEditingItem] = useState<{item: FormalizationItem, type: 'elements' | 'operations' | 'components'} | null>(null);

    const [playingAudio, setPlayingAudio] = useState(false);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playerRef = useRef<ReactPlayer>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
    const [mindMapRootId, setMindMapRootId] = useState<string | null>(null);
    const [detailPopupComponentId, setDetailPopupComponentId] = useState<string | null>(null);
    const [hideLinked, setHideLinked] = useState<Record<'elements' | 'operations' | 'components', boolean>>({ elements: true, operations: true, components: true });

    const specializations = useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

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
        if (type === 'operations' || type === 'components') newItem.linkedElementIds = [];
        if (type === 'components') newItem.linkedComponentIds = [];
        
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
            finalFormalization.operations = (finalFormalization.operations || []).map(op => ({
                ...op,
                linkedElementIds: (op.linkedElementIds || []).filter(elId => elId !== id)
            }));
             finalFormalization.components = (finalFormalization.components || []).map(p => ({
                ...p,
                linkedElementIds: (p.linkedElementIds || []).filter(elId => elId !== id)
            }));
        } else if (type === 'components') {
            // Also remove this component from properties of elements and from linkedComponentIds of other components
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

    const handleSave = () => {
        if (!selectedResource || !isResource(selectedResource)) return;
        
        toast({
            title: "Saved!",
            description: "Your formalization data has been saved locally.",
        });
    };
    
    const openMindMapForElement = (elementId: string) => {
        setMindMapRootId(elementId);
        setIsMindMapModalOpen(true);
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
                <Card className="h-full flex flex-col">
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
                            <Image src={imageEmbedUrl} alt={selectedResource.name} fill objectFit="contain" />
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
                     <CardFooter>
                        <Button onClick={handleSave} disabled={!isResource(selectedResource)}>Save Formalization</Button>
                    </CardFooter>
                </Card>
            );
        }

        // Fallback for ExerciseDefinition
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
        const formalizationData = (isResource(selectedResource) && selectedResource.formalization) || undefined;
    
        const reverseElementLinks = useMemo(() => {
            if (!formalizationData) return new Map();
            const map = new Map<string, {name: string, type: 'operation' | 'component'}[]>();

            (formalizationData.operations || []).forEach(op => {
                (op.linkedElementIds || []).forEach(elId => {
                    if (!map.has(elId)) map.set(elId, []);
                    map.get(elId)!.push({ name: op.text, type: 'operation' });
                });
            });

             (formalizationData.components || []).forEach(p => {
                (p.linkedElementIds || []).forEach(elId => {
                    if (!map.has(elId)) map.set(elId, []);
                    map.get(elId)!.push({ name: p.text, type: 'component' });
                });
            });
            return map;
        }, [formalizationData]);
        
        const reverseComponentLinks = useMemo(() => {
            if (!formalizationData) return new Map();
            const map = new Map<string, {name: string, type: 'component' | 'element_property'}[]>();

            (formalizationData.components || []).forEach(parentComp => {
                (parentComp.linkedComponentIds || []).forEach(childCompId => {
                    if (!map.has(childCompId)) map.set(childCompId, []);
                    map.get(childCompId)!.push({ name: parentComp.text, type: 'component' });
                });
            });
            
            (formalizationData.elements || []).forEach(el => {
                if (el.properties) {
                    Object.values(el.properties).forEach(propValue => {
                        const component = formalizationData.components?.find(c => c.id === propValue);
                        if (component) {
                           if (!map.has(component.id)) map.set(component.id, []);
                           map.get(component.id)!.push({ name: el.text, type: 'element_property' });
                        }
                    });
                }
            });

            return map;
        }, [formalizationData]);

        const hiddenIds = useMemo(() => {
            const hiddenComponentIds = new Set<string>();
            if (formalizationData?.elements) {
                for (const el of formalizationData.elements) {
                    if (el.properties) {
                        for (const propVal of Object.values(el.properties)) {
                            if (formalizationData.components?.some(c => c.id === propVal)) {
                                hiddenComponentIds.add(propVal);
                            }
                        }
                    }
                }
            }
             if (formalizationData?.components) {
                for (const comp of formalizationData.components) {
                    if (comp.linkedComponentIds) {
                        for (const childId of comp.linkedComponentIds) {
                            hiddenComponentIds.add(childId);
                        }
                    }
                }
            }

            const hiddenElementIds = new Set<string>();
            hiddenComponentIds.forEach(compId => {
                const component = formalizationData?.components?.find(c => c.id === compId);
                if (component?.linkedElementIds) {
                    component.linkedElementIds.forEach(elId => hiddenElementIds.add(elId));
                }
            });

            const hiddenOperationIds = new Set<string>();
            hiddenElementIds.forEach(elId => {
                formalizationData?.operations?.forEach(op => {
                    if (op.linkedElementIds?.includes(elId)) {
                        hiddenOperationIds.add(op.id);
                    }
                });
            });

            return {
                components: hiddenComponentIds,
                elements: hiddenElementIds,
                operations: hiddenOperationIds,
            };
        }, [formalizationData]);


        let data: FormalizationItem[] = [];
        if (formalizationData) {
            let sourceData = formalizationData[type] || [];
            if (hideLinked[type]) {
                data = sourceData.filter(item => !hiddenIds[type].has(item.id));
            } else {
                data = sourceData;
            }
        }
        
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="capitalize">{title}</CardTitle>
                        <CardDescription className="text-xs">{description}</CardDescription>
                    </div>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHideLinked(prev => ({...prev, [type]: !prev[type]}))}>
                           <EyeOff className={cn("h-4 w-4", !hideLinked[type] && "text-primary")} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddItem(type)} disabled={!isResource(selectedResource)}>
                            <PlusCircle className="h-4 w-4 text-green-500"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea>
                        <div className="space-y-2 pr-2">
                            {data.map(item => {
                                const linkedElements = (item.linkedElementIds || []).map(id => formalizationData?.elements?.find(el => el.id === id)?.text).filter(Boolean);
                                const linkedComponents = (item.linkedComponentIds || []).map(id => formalizationData?.components?.find(c => c.id === id)?.text).filter(Boolean);
                                const usedInElements = type === 'elements' ? (reverseElementLinks.get(item.id) || []).map(link => link.name) : [];
                                const usedInComponents = type === 'components' ? (reverseComponentLinks.get(item.id) || []) : [];
                                
                                return (
                                <Card key={item.id} className="group relative">
                                    <CardContent className="p-3 text-sm">
                                        <p className="font-semibold">{item.text}</p>
                                        {type === 'elements' && item.properties && Object.keys(item.properties).length > 0 && (
                                            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                                                {Object.entries(item.properties).map(([key, value]) => {
                                                    const component = formalizationData?.components?.find(p => p.id === value);
                                                    return (
                                                        <div key={key} className="flex items-center gap-2">
                                                            <span className="font-medium text-foreground">{key}:</span>
                                                            {component ? (
                                                                <Badge
                                                                  variant="secondary"
                                                                  className="cursor-pointer hover:ring-1 hover:ring-primary"
                                                                  onClick={() => setDetailPopupComponentId(component.id)}
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
                                        {(type === 'operations' || type === 'components') && linkedElements.length > 0 && (
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
                                        {type === 'elements' && usedInElements.length > 0 && (
                                            <div className="mt-2 pt-2 border-t">
                                                <h5 className="font-medium text-xs text-muted-foreground">Used for:</h5>
                                                 <div className="flex flex-wrap gap-1 mt-1">
                                                    {usedInElements.map((p, i) => <Badge key={i} variant="default">{p}</Badge>)}
                                                </div>
                                            </div>
                                        )}
                                         {type === 'components' && usedInComponents.length > 0 && (
                                            <div className="mt-2 pt-2 border-t">
                                                <h5 className="font-medium text-xs text-muted-foreground">Used In:</h5>
                                                 <div className="flex flex-wrap gap-1 mt-1">
                                                    {usedInComponents.map((link, i) => <Badge key={i} variant="default" className={link.type === 'element_property' ? 'bg-blue-100 text-blue-800' : ''}>{link.name}</Badge>)}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                    <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
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
        );
    }

    return (
        <>
            <audio ref={audioRef} onEnded={() => setPlayingAudio(false)} className="hidden" />
            <div className="h-full grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                <Card className="col-span-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookCopy/> Curiosities</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow min-h-0 flex flex-col gap-4">
                        <Select value={selectedFormalizationSpecId || ''} onValueChange={setSelectedFormalizationSpecId}>
                            <SelectTrigger><SelectValue placeholder="Select Specialization..." /></SelectTrigger>
                            <SelectContent>
                                {specializations.map(spec => (
                                    <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <div className="col-span-1 md:col-span-3 lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 h-full min-h-[600px]">
                        {renderSelectedResource()}
                    </div>

                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {renderFormalizationSection('elements', 'Elements', 'Atomic concepts, formulas, code snippets.')}
                        {renderFormalizationSection('operations', 'Operations', 'How elements interact; inputs and outputs.')}
                        {renderFormalizationSection('components', 'Components', 'Reusable templates of elements.')}
                    </div>
                </div>
            </div>
            {editingItem && (
                <ItemEditorModal
                    item={editingItem.item}
                    type={editingItem.type}
                    formalizationData={isResource(selectedResource) ? selectedResource.formalization : undefined}
                    onClose={() => setEditingItem(null)}
                    onSave={handleUpdateItem}
                />
            )}
             {detailPopupComponentId && (
                <ComponentDetailPopup
                    componentId={detailPopupComponentId}
                    formalizationData={isResource(selectedResource) ? selectedResource.formalization : undefined}
                    onClose={() => setDetailPopupComponentId(null)}
                    onOpenSubComponent={(id) => setDetailPopupComponentId(id)}
                />
            )}
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
        </>
    );
}

export default function FormalizationPage() {
    return (
        <AuthGuard>
            <FormalizationPageContent />
        </AuthGuard>
    );
}



