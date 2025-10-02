
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
import { BrainCircuit, BookCopy, ChevronRight, Folder, Link as LinkIcon, Library, Youtube, Globe, ExternalLink, MessageSquare, Code, ArrowRight, PlusCircle, Edit, Trash2, Play, Pause } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getAudio } from '@/lib/audioDB';
import ReactPlayer from 'react-player/youtube';


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

const ItemEditorModal = ({ item, type, onClose, onSave }: { item: FormalizationItem | null; type: string; onClose: () => void; onSave: (id: string, text: string) => void; }) => {
    const [text, setText] = useState('');
    
    useEffect(() => {
        if (item) {
            setText(item.text);
        }
    }, [item]);

    const handleSave = () => {
        if (item) {
            onSave(item.id, text);
        }
    };

    return (
        <Dialog open={!!item} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {type}</DialogTitle>
                </DialogHeader>
                <Textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                    className="min-h-[200px]"
                />
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


function FormalizationPageContent() {
    const { resources, setResources, coreSkills, upskillDefinitions, openGeneralPopup, globalVolume } = useAuth();
    const { toast } = useToast();
    
    const [selectedSpecializationId, setSelectedSpecializationId] = useState<string>('');
    const [selectedResource, setSelectedResource] = useState<Resource | ExerciseDefinition | null>(null);

    const [editingItem, setEditingItem] = useState<{item: FormalizationItem, type: 'elements' | 'operations' | 'patterns'} | null>(null);

    const [playingAudio, setPlayingAudio] = useState(false);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playerRef = useRef<ReactPlayer>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

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
    
    const formatTime = (seconds: number): string => {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = (type: 'elements' | 'operations' | 'patterns', items: FormalizationItem[]) => {
        if (!selectedResource || !isResource(selectedResource)) {
            toast({ title: "Error", description: "No valid resource selected to save formalization data.", variant: "destructive" });
            return;
        }
        
        const updatedResource = {
            ...selectedResource,
            formalization: {
                ...selectedResource.formalization,
                [type]: items
            }
        };
        setResources(prev => prev.map(res => res.id === updatedResource.id ? updatedResource : res));
        setSelectedResource(updatedResource);
    };

    const handleAddItem = (type: 'elements' | 'operations' | 'patterns') => {
        if (!selectedResource || !isResource(selectedResource)) return;
        const newItem: FormalizationItem = { id: `item_${Date.now()}`, text: `New ${type.slice(0, -1)}` };
        const currentItems = selectedResource.formalization?.[type] || [];
        handleSave(type, [...currentItems, newItem]);
        setEditingItem({ item: newItem, type });
    };

    const handleUpdateItem = (type: 'elements' | 'operations' | 'patterns', id: string, text: string) => {
        if (!selectedResource || !isResource(selectedResource)) return;
        const currentItems = selectedResource.formalization?.[type] || [];
        const updatedItems = currentItems.map(item => item.id === id ? {...item, text} : item);
        handleSave(type, updatedItems);
    };

    const handleDeleteItem = (type: 'elements' | 'operations' | 'patterns', id: string) => {
        if (!selectedResource || !isResource(selectedResource)) return;
        const currentItems = selectedResource.formalization?.[type] || [];
        const updatedItems = currentItems.filter(item => item.id !== id);
        handleSave(type, updatedItems);
    };

    const renderSelectedResource = () => {
        if (!selectedResource) {
            return (
                <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Select an item from the sidebar</p>
                </div>
            );
        }
        
        const formalization = (isResource(selectedResource) && selectedResource.formalization) || {};

        if (isResource(selectedResource)) {
            const youtubeEmbedUrl = getYouTubeEmbedUrl(selectedResource.link);
            const imageEmbedUrl = isImageUrl(selectedResource.link) ? selectedResource.link : null;

            return (
                <Card className="h-full flex flex-col">
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
                    ) : audioSrc ? (
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
                    ) : null}
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

    return (
        <>
             <audio ref={audioRef} onEnded={() => setPlayingAudio(false)} className="hidden" />
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
                        {(['elements', 'operations', 'patterns'] as const).map(type => {
                            const data = (isResource(selectedResource) && selectedResource.formalization?.[type]) || [];
                            const descriptions = {
                                elements: 'Atomic concepts, formulas, code snippets.',
                                operations: 'How elements interact; inputs and outputs.',
                                patterns: 'Reusable templates of operations and elements.'
                            };
                            return (
                                <Card key={type}>
                                    <CardHeader>
                                        <CardTitle className="capitalize">{type}</CardTitle>
                                        <CardDescription className="text-xs">{descriptions[type]}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-64">
                                            <div className="space-y-2">
                                                {data.map(item => (
                                                    <Card key={item.id} className="group relative">
                                                        <CardContent className="p-3 text-sm">
                                                            {item.text}
                                                        </CardContent>
                                                        <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem({ item, type })}><Edit className="h-4 w-4" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(type, item.id)}><Trash2 className="h-4 w-4" /></Button>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                        <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => handleAddItem(type)} disabled={!isResource(selectedResource)}><PlusCircle className="mr-2 h-4 w-4" /> Add {type.slice(0,-1)}</Button>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            </div>
            {editingItem && (
                 <ItemEditorModal
                    item={editingItem.item}
                    type={editingItem.type.slice(0, -1)}
                    onClose={() => setEditingItem(null)}
                    onSave={(id, text) => {
                        handleUpdateItem(editingItem.type, id, text);
                        setEditingItem(null);
                    }}
                />
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
