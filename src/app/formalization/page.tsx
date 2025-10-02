
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Resource, CoreSkill, ExerciseDefinition, FormalizationData, FormalizationItem } from '@/types/workout';
import { BrainCircuit, BookCopy, ChevronRight, Folder, Link as LinkIcon, Library, Youtube, Globe, ExternalLink, MessageSquare, Code, ArrowRight, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
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

const FormalizationItemCard = ({ item, onUpdate, onDelete, onEdit }: { item: FormalizationItem; onUpdate: (id: string, text: string) => void; onDelete: (id: string) => void; onEdit: (item: FormalizationItem) => void; }) => {
    return (
        <Card className="group relative">
            <CardContent className="p-3 text-sm">
                {item.text}
            </CardContent>
            <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
        </Card>
    )
};

function FormalizationPageContent() {
    const { resources, setResources, coreSkills, upskillDefinitions } = useAuth();
    const { toast } = useToast();
    
    const [selectedSpecializationId, setSelectedSpecializationId] = useState<string>('');
    const [selectedResource, setSelectedResource] = useState<Resource | ExerciseDefinition | null>(null);

    const [formalizationData, setFormalizationData] = useState<FormalizationData>({
        elements: [], operations: [], patterns: []
    });
    const [editingItem, setEditingItem] = useState<{item: FormalizationItem, type: 'elements' | 'operations' | 'patterns'} | null>(null);

    const specializations = useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

    const curiositiesForSpecialization = useMemo(() => {
        if (!selectedSpecializationId) return [];
        const spec = coreSkills.find(s => s.id === selectedSpecializationId);
        if (!spec) return [];
        
        const microSkillNames = new Set(spec.skillAreas.flatMap(sa => sa.microSkills.map(ms => ms.name)));
        
        const allChildIds = new Set(
            upskillDefinitions.flatMap(def => def.linkedUpskillIds || [])
        );

        return upskillDefinitions.filter(def => 
            microSkillNames.has(def.category) && !allChildIds.has(def.id)
        );
    }, [selectedSpecializationId, coreSkills, upskillDefinitions]);

    const isResource = (item: any): item is Resource => item && 'folderId' in item;

    const updateResourceFormalization = useCallback((resourceId: string, data: FormalizationData) => {
        setResources(prevResources => {
            return prevResources.map(res => 
                res.id === resourceId ? { ...res, formalization: data } : res
            );
        });
    }, [setResources]);
    
    useEffect(() => {
        if (selectedResource && isResource(selectedResource)) {
            setFormalizationData(selectedResource.formalization || { elements: [], operations: [], patterns: [] });
        } else {
            setFormalizationData({ elements: [], operations: [], patterns: [] });
        }
    }, [selectedResource]);

    const handleSave = () => {
        if (!selectedResource || !isResource(selectedResource)) {
            toast({ title: "Error", description: "No valid resource selected to save formalization data.", variant: "destructive" });
            return;
        }
        updateResourceFormalization(selectedResource.id, formalizationData);
        toast({ title: "Success", description: "Formalization data saved." });
    };

    const handleAddItem = (type: 'elements' | 'operations' | 'patterns') => {
        const newItem: FormalizationItem = { id: `item_${Date.now()}`, text: `New ${type.slice(0, -1)}` };
        setFormalizationData(prev => ({...prev, [type]: [...(prev[type] || []), newItem]}));
        setEditingItem({ item: newItem, type });
    };

    const handleUpdateItem = (type: 'elements' | 'operations' | 'patterns', id: string, text: string) => {
        setFormalizationData(prev => ({
            ...prev,
            [type]: (prev[type] || []).map(item => item.id === id ? {...item, text} : item)
        }));
    };

    const handleDeleteItem = (type: 'elements' | 'operations' | 'patterns', id: string) => {
        setFormalizationData(prev => ({
            ...prev,
            [type]: (prev[type] || []).filter(item => item.id !== id)
        }));
    };
    
    const handleSaveEditItem = (newItemText: string) => {
        if (!editingItem) return;
        handleUpdateItem(editingItem.type, editingItem.item.id, newItemText);
        setEditingItem(null);
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
                    {youtubeEmbedUrl ? (
                        <div className="aspect-video w-full bg-black rounded-t-lg">
                             <iframe src={youtubeEmbedUrl} title={selectedResource.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                        </div>
                    ) : imageEmbedUrl ? (
                         <div className="aspect-video w-full bg-black relative rounded-t-lg">
                            <Image src={imageEmbedUrl} alt={selectedResource.name} layout="fill" objectFit="contain" />
                        </div>
                    ) : null}
                    <CardHeader>
                        <CardTitle className="truncate" title={selectedResource.name}>
                            <div className="flex items-center gap-2">
                                {selectedResource.iconUrl ? <Image src={selectedResource.iconUrl} alt="favicon" width={16} height={16} /> : <Globe className="h-4 w-4" />}
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
                                        {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> : point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> : <ArrowRight className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />}
                                        {point.type === 'markdown' ? (<div className="w-full prose dark:prose-invert prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown></div>) 
                                        : point.type === 'code' ? (
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
                        <Button onClick={handleSave}>Save Formalization</Button>
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
                <CardFooter>
                    <Button onClick={handleSave} disabled={true}>Save Formalization</Button>
                </CardFooter>
            </Card>
        );
    };

    return (
        <>
            <div className="h-full grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                <Card className="col-span-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookCopy/> Curiosities</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow min-h-0 flex flex-col gap-4">
                        <Select value={selectedSpecializationId} onValueChange={setSelectedSpecializationId}>
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
                        <Card>
                            <CardHeader>
                                <CardTitle>Elements</CardTitle>
                                <CardDescription className="text-xs">Atomic concepts, formulas, code snippets.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-64">
                                    <div className="space-y-2">
                                        {(formalizationData.elements || []).map(el => <FormalizationItemCard key={el.id} item={el} onUpdate={(id, text) => handleUpdateItem('elements', id, text)} onDelete={(id) => handleDeleteItem('elements', id)} onEdit={(item) => setEditingItem({ item, type: 'elements' })} />)}
                                    </div>
                                </ScrollArea>
                                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => handleAddItem('elements')}><PlusCircle className="mr-2 h-4 w-4" /> Add Element</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Operations</CardTitle>
                                <CardDescription className="text-xs">How elements interact; inputs and outputs.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <ScrollArea className="h-64">
                                    <div className="space-y-2">
                                        {(formalizationData.operations || []).map(op => <FormalizationItemCard key={op.id} item={op} onUpdate={(id, text) => handleUpdateItem('operations', id, text)} onDelete={(id) => handleDeleteItem('operations', id)} onEdit={(item) => setEditingItem({ item, type: 'operations' })} />)}
                                    </div>
                                </ScrollArea>
                                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => handleAddItem('operations')}><PlusCircle className="mr-2 h-4 w-4" /> Add Operation</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Patterns</CardTitle>
                                <CardDescription className="text-xs">Reusable templates of operations and elements.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-64">
                                    <div className="space-y-2">
                                        {(formalizationData.patterns || []).map(pat => <FormalizationItemCard key={pat.id} item={pat} onUpdate={(id, text) => handleUpdateItem('patterns', id, text)} onDelete={(id) => handleDeleteItem('patterns', id)} onEdit={(item) => setEditingItem({ item, type: 'patterns' })}/>)}
                                    </div>
                                </ScrollArea>
                                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => handleAddItem('patterns')}><PlusCircle className="mr-2 h-4 w-4" /> Add Pattern</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            {editingItem && (
                <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit {editingItem.type.slice(0, -1)}</DialogTitle>
                        </DialogHeader>
                        <Textarea 
                            defaultValue={editingItem.item.text}
                            onBlur={(e) => handleSaveEditItem(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    handleSaveEditItem(e.currentTarget.value);
                                }
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
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
