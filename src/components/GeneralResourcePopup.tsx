
      "use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, X, GripVertical, Library, MessageSquare, Code, ArrowRight, Upload, Play, Pause, Unlink, Edit3, PlusCircle, PopoverClose, Trash2, Blocks, Loader2, Brain, View, Pin, PinOff, ChevronRight, Link as LinkIcon, Workflow } from 'lucide-react';
import type { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EditableField, DoubleEditableField, EmotionEditableField, EditableResponse, EditableResourcePoint } from '@/components/EditableFields';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAudio, storeAudio } from '@/lib/audioDB';
import { useRouter } from 'next/navigation';

interface GeneralResourcePopupProps {
  popupState: PopupState;
  onClose: (id: string) => void;
  onUpdate: (resource: Resource) => void;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;
}

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};


export function GeneralResourcePopup({ popupState, onClose, onUpdate, onOpenNestedPopup }: GeneralResourcePopupProps) {
    const { resources, resourceFolders, globalVolume, openContentViewPopup, createResourceWithHierarchy, setFloatingVideoUrl, openPistonsFor, handleCreateBrainHack, settings, setSettings, playbackRequest, setPlaybackRequest, setSelectedResourceFolderId } = useAuth();
    const router = useRouter();
    const [editingTitle, setEditingTitle] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [playingAudio, setPlayingAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [newAnnotation, setNewAnnotation] = useState('');
    
    const resource = resources.find(r => r.id === popupState.resourceId);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `general-popup-${popupState.resourceId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        width: `${popupState.width || 420}px`,
        willChange: 'transform',
        zIndex: 65 + (popupState.level || 0),
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }
    
     useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl || !resource?.id) return;
        
        const loadAudio = async () => {
          if (resource.hasLocalAudio) {
            const audioBlob = await getAudio(resource.id);
            if (audioBlob) {
              const url = URL.createObjectURL(audioBlob);
              setAudioSrc(url);
              return () => URL.revokeObjectURL(url);
            }
          }
          setAudioSrc(null);
        };
        
        loadAudio();
     }, [resource?.id, resource?.hasLocalAudio]);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl || !audioSrc) return;
    
        if (audioEl.src !== audioSrc) {
          audioEl.src = audioSrc;
        }
    
        if (playingAudio) {
          audioEl.volume = globalVolume;
          audioEl.play().catch(e => console.error("Audio play failed:", e));
        } else {
          audioEl.pause();
        }
    }, [playingAudio, audioSrc, globalVolume]);

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
      if (!audioEl) return;

      if (playbackRequest && playbackRequest.resourceId === resource?.id) {
        audioEl.currentTime = playbackRequest.timestamp;
        setPlayingAudio(true);
        
        const checkEndTime = () => {
          if (playbackRequest.endTime && audioEl.currentTime >= playbackRequest.endTime) {
            audioEl.pause();
            setPlayingAudio(false);
            setPlaybackRequest(null);
          }
        };
        
        if (playbackRequest.endTime) {
            audioEl.addEventListener('timeupdate', checkEndTime);
            return () => {
              if (audioEl) { // Check if audioEl still exists
                audioEl.removeEventListener('timeupdate', checkEndTime);
              }
            };
        } else {
            setPlaybackRequest(null);
        }
      }
    }, [playbackRequest, resource?.id, setPlaybackRequest]);

    const folderPath = useMemo(() => {
      if (!resource || !resource.folderId || !resourceFolders) {
        return '';
      }
      const path: string[] = [];
      let currentFolderId: string | null = resource.folderId;
      while (currentFolderId) {
        const folder = resourceFolders.find(f => f.id === currentFolderId);
        if (folder) {
          path.unshift(folder.name);
          currentFolderId = folder.parentId;
        } else {
          currentFolderId = null;
        }
      }
      return path.join(' / ');
    }, [resource, resourceFolders]);


    if (!resource) return null;

    const handleTitleChange = (newTitle: string) => {
        onUpdate({ ...resource, name: newTitle });
    };

    const handleAddPoint = (type: ResourcePoint['type']) => {
        let newPoint: ResourcePoint;
        if (type === 'timestamp') {
          const newTimestamp = Math.max(0, currentTime - 30);
          newPoint = { id: `point_${Date.now()}`, text: newAnnotation || 'New Note', type, timestamp: newTimestamp };
          setNewAnnotation('');
        } else {
          newPoint = { id: `point_${Date.now()}`, text: 'New step...', type };
        }
        
        const updatedPoints = [...(resource.points || []), newPoint];
        
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleUpdatePoint = (pointId: string, updatedPoint: Partial<ResourcePoint>) => {
        const updatedPoints = (resource.points || []).map(p =>
            p.id === pointId ? { ...p, ...updatedPoint } : p
        );
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleDeletePoint = (pointId: string) => {
        const updatedPoints = (resource.points || []).filter(p => p.id !== pointId);
        onUpdate({ ...resource, points: updatedPoints });
    };
    
    const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setPlayingAudio(false);
        onClose(resource.id);
    };

    const handleSeekTo = (timestamp: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = timestamp;
            if (audioRef.current.paused) {
                setPlayingAudio(true);
            }
        }
    };
    
    const handleViewOnPage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (resource.folderId) {
            setSelectedResourceFolderId(resource.folderId);
            router.push('/resources');
            onClose(resource.id);
        }
    };


    const getIcon = () => {
        switch (resource.type) {
            case 'habit': return <Zap className="h-5 w-5 text-primary"/>;
            case 'mechanism': return <Workflow className="h-5 w-5 text-primary"/>;
            case 'card': return <Library className="h-5 w-5 text-primary"/>;
            default: return <Library className="h-5 w-5 text-primary"/>;
        }
    };

    const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        try {
          await storeAudio(resource.id, file);
          onUpdate({ ...resource, hasLocalAudio: true });
        } catch (error) {
          console.error("Failed to store audio in IndexedDB", error);
        }
      }
    };
    
    const togglePlayAudio = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setPlayingAudio(prev => !prev);
    };

    const handleToggleFavorite = () => {
      onUpdate({ ...resource, isFavorite: !resource.isFavorite });
    };

    const renderContent = () => {
        switch (resource.type) {
            case 'card':
                return (
                    <ul className="space-y-3 text-sm text-muted-foreground pr-2">
                        {(resource.points || []).sort((a, b) => (a.timestamp === undefined ? Infinity : a.timestamp) - (b.timestamp === undefined ? Infinity : b.timestamp)).map(point => (
                            <EditableResourcePoint 
                                key={point.id}
                                point={point}
                                onUpdate={handleUpdatePoint}
                                onDelete={() => handleDeletePoint(point.id)}
                                onOpenNestedPopup={(e) => onOpenNestedPopup(point.resourceId!, e, popupState)}
                                onOpenContentView={(e) => handleOpenContentView(point, e)}
                                onConvertToCard={() => createResourceWithHierarchy(resource, point, 'card')}
                                onSeekTo={handleSeekTo}
                                currentTime={currentTime}
                                onSetEndTime={() => handleUpdatePoint(point.id, { endTime: Math.max(0, currentTime) })}
                                onClearEndTime={() => handleUpdatePoint(point.id, { endTime: undefined })}
                            />
                        ))}
                    </ul>
                );
            case 'habit':
                return (
                    <div className="space-y-1">
                        <EditableField field="trigger" subField="action" prefix="Trigger: When I" suffix="." resource={resource} onUpdate={onUpdate} />
                        <EditableResponse field="response" label="" resource={resource} onUpdate={onUpdate} onOpenNestedPopup={(id, e) => onOpenNestedPopup(id, e, popupState)} popupState={popupState} />
                        <EditableField field="reward" prefix="Reward:" resource={resource} onUpdate={onUpdate} />
                        <EditableResponse field="newResponse" label="" resource={resource} onUpdate={onUpdate} onOpenNestedPopup={(id, e) => onOpenNestedPopup(id, e, popupState)} popupState={popupState} />
                    </div>
                );
            case 'mechanism':
                return resource.mechanismFramework === 'positive' ? (
                     <div className="space-y-4 text-sm">
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Action</h4>
                            <EditableField field="trigger" subField="action" prefix="When I " suffix="," resource={resource} onUpdate={onUpdate} placeholder="describe the positive action"/>
                        </div>
                         <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Mechanism</h4>
                            <EditableField field="response" subField="visualize" prefix="It causes " suffix=" internally." resource={resource} onUpdate={onUpdate} placeholder="positive internal effect"/>
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Benefit</h4>
                            <EditableField field="benefit" prefix="This enables " suffix="." resource={resource} onUpdate={onUpdate} placeholder="good outcome"/>
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Condition</h4>
                            <DoubleEditableField prefix="Only when " infix=", " suffix=" happens." value1={resource.newResponse?.visualize || ""} value2={resource.newResponse?.action || ""} onUpdate1={(newValue) => onUpdate({ ...resource, newResponse: { ...(resource.newResponse || {}), visualize: newValue } })} onUpdate2={(newValue) => onUpdate({ ...resource, newResponse: { ...(resource.newResponse || {}), action: newValue } })} placeholder1="specific condition" placeholder2="good outcome" />
                        </div>
                         <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Law</h4>
                            <DoubleEditableField prefix="" infix=" can only happen when " suffix="." value1={resource.law?.premise || ""} value2={resource.law?.outcome || ""} onUpdate1={(newValue) => onUpdate({ ...resource, law: { ...(resource.law || {}), premise: newValue } })} onUpdate2={(newValue) => onUpdate({ ...resource, law: { ...(resource.law || {}), outcome: newValue } })} placeholder1="Good Thing" placeholder2="Positive Condition"/>
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Emotion/Image</h4>
                            <EmotionEditableField value1={resource.trigger?.feeling || ''} value2={resource.reward || ''} onUpdate1={(newValue) => onUpdate({ ...resource, trigger: { ...(resource.trigger || {}), feeling: newValue } })} onUpdate2={(newValue) => onUpdate({ ...resource, reward: newValue })} label=" gives me " placeholder1="action/image" placeholder2="positive feeling"/>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 text-sm">
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Action</h4>
                            <EditableField field="trigger" subField="action" prefix="When I " suffix="," resource={resource} onUpdate={onUpdate} placeholder="describe the negative action"/>
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Mechanism</h4>
                            <EditableField field="response" subField="visualize" prefix="It causes " suffix=" internally." resource={resource} onUpdate={onUpdate} placeholder="negative internal effect"/>
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Cost</h4>
                            <EditableField field="reward" prefix="This blocks " suffix="." resource={resource} onUpdate={onUpdate} placeholder="good outcome"/>
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Opposite</h4>
                            <DoubleEditableField prefix="Only when " infix=", " suffix=" happens." value1={resource.newResponse?.visualize || ""} value2={resource.newResponse?.action || ""} onUpdate1={(newValue) => onUpdate({ ...resource, newResponse: { ...(resource.newResponse || {}), visualize: newValue } })} onUpdate2={(newValue) => onUpdate({ ...resource, newResponse: { ...(resource.newResponse || {}), action: newValue } })} placeholder1="avoidance of bad action" placeholder2="good outcome" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Law</h4>
                            <DoubleEditableField prefix="" infix=" cannot happen when " suffix="." value1={resource.law?.premise || ""} value2={resource.law?.outcome || ""} onUpdate1={(newValue) => onUpdate({ ...resource, law: { ...(resource.law || {}), premise: newValue } })} onUpdate2={(newValue) => onUpdate({ ...resource, law: { ...(resource.law || {}), outcome: newValue } })} placeholder1="Good Thing" placeholder2="Negative Condition"/>
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Emotion/Image</h4>
                            <EmotionEditableField value1={resource.trigger?.feeling || ''} value2={resource.benefit || ''} onUpdate1={(newValue) => onUpdate({ ...resource, trigger: { ...(resource.trigger || {}), feeling: newValue } })} onUpdate2={(newValue) => onUpdate({ ...resource, benefit: newValue })} label=" costs me " placeholder1="action/image" placeholder2="negative consequence"/>
                        </div>
                    </div>
                );
            default:
                return <p className="text-sm text-muted-foreground">Unknown resource type.</p>;
        }
    };
    
    const handleOpenContentView = (point: ResourcePoint, event: React.MouseEvent) => {
        openContentViewPopup(`content-${point.id}`, resource, point, event);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} data-popup-id={popupState.resourceId}>
            <audio ref={audioRef} onEnded={() => setPlayingAudio(false)} />
            <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
            <Card className="shadow-2xl border-2 border-primary/30 bg-card flex flex-col max-h-[80vh] relative group">
                <div className="absolute top-2 right-2 z-20 flex items-center">
                    <TooltipProvider delayDuration={200}>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleFavorite}>
                            {resource.isFavorite ? <PinOff className="h-4 w-4 text-yellow-400" /> : <Pin className="h-4 w-4" />}
                        </Button></TooltipTrigger><TooltipContent><p>{resource.isFavorite ? 'Un-favorite' : 'Favorite'}</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleViewOnPage}><View className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>View on Page</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => { e.stopPropagation(); audioInputRef.current?.click();}}><Upload className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Upload Audio</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('text')}><MessageSquare className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>Add Text</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('markdown')}><MessageSquare className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>Add Markdown</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('code')}><Code className="h-4 w-4 text-green-500" /></Button></TooltipTrigger><TooltipContent><p>Add Code</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('link')}><LinkIcon className="h-4 w-4 text-purple-500" /></Button></TooltipTrigger><TooltipContent><p>Add Link</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCreateBrainHack(resource.id, 'resource', resource.id)}><Brain className="h-4 w-4 text-pink-500" /></Button></TooltipTrigger><TooltipContent><p>Create Brain Hack</p></TooltipContent></Tooltip>
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <CardHeader className="p-3 pt-8 relative flex-shrink-0">
                    <div
                        className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing"
                        {...listeners}
                    >
                        <GripVertical className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                    <div className="flex items-center gap-2">
                        {getIcon()}
                        {editingTitle ? (
                             <Input 
                                value={resource.name || ''}
                                onChange={(e) => handleTitleChange(e.target.value)} 
                                onBlur={() => setEditingTitle(false)} 
                                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                                className="h-8 text-base font-semibold border-none bg-transparent shadow-none focus-visible:ring-0 p-0"
                                autoFocus
                            />
                        ) : (
                            <CardTitle className="text-base truncate cursor-pointer" onClick={() => setEditingTitle(true)}>
                                {resource.name || <span className="text-muted-foreground">[Untitled]</span>}
                            </CardTitle>
                        )}
                    </div>
                    {folderPath && (
                        <CardDescription className="text-xs pt-1 truncate" title={folderPath}>
                          <span className="flex items-center gap-1">
                            {folderPath.split(' / ').map((part, index, arr) => (
                                <React.Fragment key={index}>
                                    <span>{part}</span>
                                    {index < arr.length - 1 && <ChevronRight className="h-3 w-3" />}
                                </React.Fragment>
                            ))}
                          </span>
                        </CardDescription>
                    )}
                     {resource.hasLocalAudio && (
                        <div className="w-full space-y-2 pt-2">
                            <div className="flex items-center gap-2">
                                 <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={togglePlayAudio}>
                                    {playingAudio ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
                                </Button>
                                <span className="text-xs font-mono text-muted-foreground">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value); }}
                                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-xs font-mono text-muted-foreground">{formatTime(duration)}</span>
                            </div>
                        </div>
                    )}
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-3 pt-0">
                        {renderContent()}
                    </CardContent>
                </div>
                 <CardFooter className="p-3 border-t">
                     <div className="flex gap-2 w-full">
                        {resource.hasLocalAudio && (
                          <div className="flex gap-2 w-full">
                             <Input value={newAnnotation} onChange={e => setNewAnnotation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPoint('timestamp')} placeholder="Add a note at current time..." className="h-8 text-xs" />
                             <Button size="sm" onClick={() => handleAddPoint('timestamp')}>Add Note</Button>
                         </div>
                        )}
                     </div>
                 </CardFooter>
            </Card>
        </div>
    );
}

