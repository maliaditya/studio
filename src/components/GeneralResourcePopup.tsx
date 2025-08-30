
"use client";

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, X, GripVertical, Library, MessageSquare, Code, ArrowRight, Upload, Play, Pause, Workflow, Link as LinkIcon, Edit3, Unlink, PlusCircle, PopoverClose, Trash2, Blocks, Loader2 } from 'lucide-react';
import type { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EditableField, DoubleEditableField, EmotionEditableField, EditableResponse } from '@/components/EditableFields';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GeneralResourcePopupProps {
  popupState: PopupState;
  onClose: (id: string) => void;
  onUpdate: (resource: Resource) => void;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;
}

export function GeneralResourcePopup({ popupState, onClose, onUpdate, onOpenNestedPopup }: GeneralResourcePopupProps) {
    const { resources, globalVolume, openContentViewPopup, createResourceWithHierarchy, setFloatingVideoUrl } = useAuth();
    const [editingTitle, setEditingTitle] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [playingAudio, setPlayingAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    
    const resource = resources.find(r => r.id === popupState.resourceId);
    
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
    
    React.useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl || !resource?.audioUrl) return;
    
        if (playingAudio) {
          if (audioEl.src !== resource.audioUrl) {
            audioEl.src = resource.audioUrl;
          }
          audioEl.volume = globalVolume;
          audioEl.play().catch(e => console.error("Audio play failed:", e));
        } else {
          audioEl.pause();
        }
    }, [playingAudio, resource?.audioUrl, globalVolume]);

    if (!resource) return null;

    const handleTitleChange = (newTitle: string) => {
        onUpdate({ ...resource, name: newTitle });
    };

    const handleAddPoint = (type: ResourcePoint['type']) => {
        const newPoint: ResourcePoint = { id: `point_${Date.now()}`, text: 'New step...', type };
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

    const getIcon = () => {
        switch (resource.type) {
            case 'habit': return <Zap className="h-5 w-5 text-primary"/>;
            case 'mechanism': return <Workflow className="h-5 w-5 text-primary"/>;
            case 'card': return <Library className="h-5 w-5 text-primary"/>;
            default: return <Library className="h-5 w-5 text-primary"/>;
        }
    };

    const handleOpenContentView = (point: ResourcePoint, e: React.MouseEvent) => {
        openContentViewPopup(`content-${point.id}`, resource, point, e);
    };

    const renderContent = () => {
        switch (resource.type) {
            case 'card':
                return (
                    <ul className="space-y-3 text-sm text-muted-foreground pr-2">
                        {(resource.points || []).map(point => (
                            <EditableResourcePoint 
                                key={point.id}
                                point={point}
                                onUpdate={handleUpdatePoint}
                                onDelete={() => handleDeletePoint(point.id)}
                                onOpenNestedPopup={(e) => onOpenNestedPopup(point.resourceId!, e, popupState)}
                                onOpenContentView={(e) => handleOpenContentView(point, e)}
                                onConvertToCard={() => createResourceWithHierarchy(resource, point, 'card')}
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
                        <EditableResponse field="newResponse" label="New Response" resource={resource} onUpdate={onUpdate} onOpenNestedPopup={(id, e) => onOpenNestedPopup(id, e, popupState)} popupState={popupState}/>
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

    return (
        <div ref={setNodeRef} style={style} {...attributes} data-popup-id={popupState.resourceId}>
            <audio ref={audioRef} />
            <Card className="shadow-2xl border-2 border-primary/30 bg-card flex flex-col max-h-[70vh] relative group">
                <div className="absolute top-2 left-2 z-20 p-1 cursor-grab active:cursor-grabbing" {...listeners}>
                    <GripVertical className="h-5 w-5 text-muted-foreground/50"/>
                </div>
                <div className="absolute top-2 right-2 z-20 flex items-center">
                    <TooltipProvider delayDuration={200}>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('text')}><MessageSquare className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>Add Text</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('markdown')}><MessageSquare className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>Add Markdown</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('code')}><Code className="h-4 w-4 text-green-500" /></Button></TooltipTrigger><TooltipContent><p>Add Code</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('link')}><LinkIcon className="h-4 w-4 text-purple-500" /></Button></TooltipTrigger><TooltipContent><p>Add Link</p></TooltipContent></Tooltip>
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <CardHeader className="p-3 pt-8 relative flex-shrink-0 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {getIcon()}
                        {editingTitle ? (
                            <Input 
                                value={resource.name} 
                                onChange={(e) => handleTitleChange(e.target.value)} 
                                onBlur={() => setEditingTitle(false)} 
                                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                                className="h-8 text-base"
                                autoFocus
                            />
                        ) : (
                            <CardTitle className="text-base truncate cursor-pointer" onClick={() => setEditingTitle(true)}>
                                {resource.name}
                            </CardTitle>
                        )}
                    </div>
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-3 pt-0">
                        {renderContent()}
                    </CardContent>
                </div>
            </Card>
        </div>
    );
}

const EditableResourcePoint = ({ point, onUpdate, onDelete, onOpenNestedPopup, onOpenContentView, onConvertToCard }: { 
    point: ResourcePoint, 
    onUpdate: (pointId: string, updatedPoint: Partial<ResourcePoint>) => void, 
    onDelete: () => void,
    onOpenNestedPopup: (event: React.MouseEvent) => void;
    onOpenContentView: (event: React.MouseEvent) => void;
    onConvertToCard: () => void;
}) => {
    const { setFloatingVideoUrl } = useAuth();
    
    const [isEditing, setIsEditing] = useState(point.text === 'New step...');
    const [editText, setEditText] = useState(point.text);
    const [isFetchingMeta, setIsFetchingMeta] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = async () => {
        if (editText.trim() === '') {
            onDelete();
            return;
        }

        if (point.type === 'link' && editText.trim() !== point.text) {
            setIsFetchingMeta(true);
            try {
                const response = await fetch('/api/get-link-metadata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: editText.trim() }),
                });
                const result = await response.json();
                if (response.ok) {
                    onUpdate(point.id, { text: editText.trim(), displayText: result.title || editText.trim() });
                } else {
                    onUpdate(point.id, { text: editText.trim(), displayText: editText.trim() });
                }
            } catch (error) {
                onUpdate(point.id, { text: editText.trim(), displayText: editText.trim() });
            } finally {
                setIsFetchingMeta(false);
            }
        } else {
            onUpdate(point.id, { text: editText.trim() });
        }
        setIsEditing(false);
    };

    React.useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing]);
    
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    }
    
     if (point.type === 'card' && point.resourceId) {
        return (
            <li className="flex items-start gap-3 group/item">
                <ArrowRight className="h-4 w-4 mt-1.5 text-primary/50 flex-shrink-0" />
                <button onClick={onOpenNestedPopup} className="text-left font-medium text-primary hover:underline flex-grow">
                    {point.text}
                </button>
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100 flex-shrink-0" onClick={onDelete}>
                    <Trash2 className="h-3 w-3"/>
                </Button>
            </li>
        )
    }

    return (
        <li className="flex items-start gap-3 group/item w-full">
            {point.type === 'code' ? <Code className="h-4 w-4 mt-1.5 text-primary/70 flex-shrink-0" /> :
            point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-1.5 text-primary/70 flex-shrink-0" /> :
            point.type === 'link' ? <LinkIcon className="h-4 w-4 mt-1.5 text-primary/70 flex-shrink-0" /> :
            <ArrowRight className="h-4 w-4 mt-1.5 text-primary/50 flex-shrink-0" />
            }
             <div className="flex-grow min-w-0" onDoubleClick={() => !isEditing && setIsEditing(true)}>
                {isEditing ? (
                    <Textarea 
                        ref={textareaRef} 
                        value={editText} 
                        onChange={handleTextareaChange} 
                        onBlur={handleSave} 
                        className="text-sm" 
                        rows={1}
                    />
                ) : point.type === 'markdown' || point.type === 'code' ? (
                    <div className="w-full prose dark:prose-invert prose-sm cursor-pointer" onClick={onOpenContentView}>
                      {point.type === 'markdown' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text}</ReactMarkdown>
                      ) : (
                        <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '0.5rem', borderRadius: '0.375rem', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} codeTagProps={{style: {fontSize: '0.8rem', fontFamily: 'monospace'}}}>
                            {point.text || ""}
                        </SyntaxHighlighter>
                      )}
                    </div>
                ) : point.type === 'link' ? (
                     <div className="flex-grow min-w-0 flex items-center gap-1">
                        <span 
                            className="cursor-pointer text-primary hover:underline" 
                            onClick={() => point.text && setFloatingVideoUrl(point.text)}
                        >
                            {isFetchingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : (point.displayText || point.text || <span className="text-muted-foreground italic">New link...</span>)}
                        </span>
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap break-words">{point.text}</p>
                )}
            </div>
            <div className="flex items-center flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                {point.type === 'text' && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onConvertToCard}>
                        <Blocks className="h-3 w-3"/>
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3 w-3"/>
                </Button>
            </div>
        </li>
    );
}

    