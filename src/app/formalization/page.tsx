
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Resource, CoreSkill, ExerciseDefinition, FormalizationData } from '@/types/workout';
import { BrainCircuit, BookCopy, ChevronRight, Folder, Link as LinkIcon, Library, Youtube, Globe, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const getFaviconUrl = (link: string): string | undefined => {
    try {
        let url = link;
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
        const urlObject = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=32`;
    } catch (e) {
        return undefined;
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

function FormalizationPageContent() {
    const { resources, setResources, coreSkills, upskillDefinitions } = useAuth();
    const { toast } = useToast();
    
    const [selectedSpecializationId, setSelectedSpecializationId] = useState<string>('');
    const [selectedResource, setSelectedResource] = useState<Resource | ExerciseDefinition | null>(null);

    const [formalizationData, setFormalizationData] = useState<FormalizationData>({
        elements: '', operations: '', patterns: ''
    });
    
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

    useEffect(() => {
        if (selectedResource) {
            // Check if it's a Resource type with formalization
            if ('folderId' in selectedResource && selectedResource.formalization) {
                 setFormalizationData(selectedResource.formalization);
            } else if ('category' in selectedResource && (selectedResource as ExerciseDefinition).description) {
                // It's an ExerciseDefinition, we can use its description as a starting point.
                // Or maybe you want a separate formalization object for ExerciseDefinitions too.
                // For now, let's just clear it or prepopulate from description.
                setFormalizationData({ elements: (selectedResource as any).description || '', operations: '', patterns: '' });
            }
             else {
                setFormalizationData({ elements: '', operations: '', patterns: '' });
            }
        }
    }, [selectedResource]);

    const handleSave = () => {
        if (!selectedResource || !('folderId' in selectedResource)) {
            toast({ title: "Error", description: "No valid resource selected to save formalization data.", variant: "destructive" });
            return;
        }

        const resourceId = selectedResource.id;
        setResources(prevResources => 
            prevResources.map(res => {
                if (res.id === resourceId) {
                    return {
                        ...res,
                        formalization: formalizationData
                    };
                }
                return res;
            })
        );
        toast({ title: "Success", description: "Formalization data saved." });
    };
    
    const isResource = (item: any): item is Resource => item && 'folderId' in item;

    return (
        <div className="h-full grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {/* Left Sidebar */}
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

            {/* Main Content */}
            <div className="col-span-1 md:col-span-3 lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                    {selectedResource ? (
                         <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="truncate" title={selectedResource.name}>{selectedResource.name}</CardTitle>
                                {isResource(selectedResource) && selectedResource.link && (
                                     <CardDescription className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                        {selectedResource.iconUrl ? (
                                            <Image src={selectedResource.iconUrl} alt="favicon" width={14} height={14} unoptimized />
                                        ) : (
                                            <Globe className="h-3 w-3" />
                                        )}
                                        <a href={selectedResource.link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{selectedResource.link}</a>
                                     </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                {isResource(selectedResource) && selectedResource.description ? (
                                    <p className="text-sm text-muted-foreground">{selectedResource.description}</p>
                                ) : !isResource(selectedResource) && selectedResource.description ? (
                                    <p className="text-sm text-muted-foreground">{selectedResource.description}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No description provided.</p>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSave} disabled={!isResource(selectedResource)}>Save Formalization</Button>
                            </CardFooter>
                        </Card>
                    ) : (
                        <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Select an item from the sidebar</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Elements</CardTitle>
                            <CardDescription className="text-xs">Atomic concepts, formulas, code snippets.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea 
                                value={formalizationData.elements} 
                                onChange={(e) => setFormalizationData(prev => ({...prev, elements: e.target.value}))}
                                placeholder="Define one element per line..." 
                                className="h-64"
                                disabled={!selectedResource}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Operations</CardTitle>
                            <CardDescription className="text-xs">How elements interact; inputs and outputs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea 
                                value={formalizationData.operations} 
                                onChange={(e) => setFormalizationData(prev => ({...prev, operations: e.target.value}))}
                                placeholder="Describe an operation..." 
                                className="h-64"
                                disabled={!selectedResource}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Patterns</CardTitle>
                            <CardDescription className="text-xs">Reusable templates of operations and elements.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea 
                                value={formalizationData.patterns} 
                                onChange={(e) => setFormalizationData(prev => ({...prev, patterns: e.target.value}))} 
                                placeholder="Describe a pattern..." 
                                className="h-64"
                                disabled={!selectedResource}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


export default function FormalizationPage() {
    return (
        <AuthGuard>
            <FormalizationPageContent />
        </AuthGuard>
    );
}

    