
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from './ui/input';
import { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Link as LinkIcon, Unlink, Trash2, Code, MessageSquare, ArrowRight, Blocks, Loader2, X } from 'lucide-react';
import { Textarea } from './ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const EditableSpan = React.memo(({ value, onBlur, placeholder, className }: {
    value: string;
    onBlur: (newValue: string) => void;
    placeholder: string;
    className?: string;
}) => {
    const ref = useRef<HTMLSpanElement>(null);

    // This effect ensures that if the parent data changes, the span updates,
    // but it won't overwrite what the user is currently typing.
    useEffect(() => {
        if (ref.current && ref.current.textContent !== value) {
            ref.current.textContent = value || placeholder;
        }
    }, [value, placeholder]);

    const handleBlur = () => {
        if (ref.current) {
            const newText = ref.current.textContent || '';
            // Only call onBlur if the text has actually changed.
            if (newText !== value) {
                onBlur(newText);
            }
        }
    };
    
    // We only need to render the span. The state is now managed directly
    // in the DOM until the `blur` event, which is more reliable for contentEditable.
    return (
        <span
            ref={ref}
            contentEditable={true}
            suppressContentEditableWarning={true}
            className={className}
            onBlur={handleBlur}
            // Use key to force re-mount if the value prop changes, which resets the textContent
            key={value}
        >
            {value || placeholder}
        </span>
    );
});
EditableSpan.displayName = 'EditableSpan';

export const EditableField = ({ field, subField, prefix, suffix, resource, onUpdate, placeholder = "..." }: {
    field: keyof Resource,
    subField?: string,
    prefix: string,
    suffix?: string,
    resource: Resource,
    onUpdate: (updatedResource: Resource) => void,
    placeholder?: string,
}) => {
    let initialValue = '';
    if (subField && typeof resource[field] === 'object' && resource[field] !== null) {
        initialValue = (resource[field] as any)[subField] || '';
    } else {
        initialValue = (resource[field] as string) || '';
    }

    const handleUpdate = (newValue: string) => {
        let updatedResource = { ...resource };
        if (subField && typeof updatedResource[field] === 'object' && updatedResource[field] !== null) {
            updatedResource[field] = { ...(updatedResource[field] as object), [subField]: newValue };
        } else if (subField) {
            updatedResource[field] = { [subField]: newValue } as any;
        } else {
            updatedResource[field] = newValue as any;
        }
        onUpdate(updatedResource);
    };

    return (
        <div className="editable-sentence">
            <span contentEditable={false} className="uneditable-text">{prefix}</span>
            <EditableSpan
                value={initialValue}
                onBlur={handleUpdate}
                placeholder={placeholder}
                className="editable-placeholder"
            />
            {suffix && <span contentEditable={false} className="uneditable-text">{suffix}</span>}
        </div>
    );
};

export const DoubleEditableField = ({ prefix, infix, suffix, value1, value2, onUpdate1, onUpdate2, placeholder1 = "...", placeholder2 = "..." }: { 
    prefix: string;
    infix: string;
    suffix: string;
    value1: string;
    value2: string;
    onUpdate1: (newValue: string) => void;
    onUpdate2: (newValue: string) => void;
    placeholder1?: string;
    placeholder2?: string;
}) => {
    return (
        <div className="editable-sentence">
          <span contentEditable={false} className="uneditable-text">{prefix}</span>
          <EditableSpan value={value1} onBlur={onUpdate1} placeholder={placeholder1} className="editable-placeholder" />
          <span contentEditable={false} className="uneditable-text">{infix}</span>
          <EditableSpan value={value2} onBlur={onUpdate2} placeholder={placeholder2} className="editable-placeholder" />
          <span contentEditable={false} className="uneditable-text">{suffix}</span>
        </div>
    );
};

export const EmotionEditableField = ({ value1, value2, onUpdate1, onUpdate2, label, placeholder1 = "...", placeholder2 = "..." }: { 
    value1: string;
    value2: string;
    onUpdate1: (newValue: string) => void;
    onUpdate2: (newValue: string) => void;
    label: string;
    placeholder1?: string;
    placeholder2?: string;
}) => {
    return (
        <div className="editable-sentence">
          <span contentEditable={false} className="uneditable-text">That one </span>
          <EditableSpan value={value1} onBlur={onUpdate1} placeholder={placeholder1} className="editable-placeholder" />
          <span contentEditable={false} className="uneditable-text">{label}</span>
          <EditableSpan value={value2} onBlur={onUpdate2} placeholder={placeholder2} className="editable-placeholder" />
          <span contentEditable={false} className="uneditable-text">.</span>
        </div>
    );
};

export const EditableResponse = ({ field, label, resource, onUpdate, onOpenNestedPopup, popupState }: { 
    field: 'response' | 'newResponse';
    label: string;
    resource: Resource;
    onUpdate: (updatedResource: Resource) => void;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;
    popupState?: PopupState;
}) => {
    const { resources } = useAuth();
    const responseValue = resource[field];
    const linkedResource = responseValue?.resourceId ? resources.find(r => r.id === responseValue.resourceId) : null;
  
    const handleUnlink = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({ ...resource, [field]: { ...(resource[field] || {}), resourceId: undefined } });
    };
  
    const handleUpdateField = (value: { text?: string; resourceId?: string }) => {
        onUpdate({ ...resource, [field]: { ...(resource[field] || {}), ...value } });
    };

    return (
        <div className="editable-sentence group/response">
          {label && <span contentEditable={false} className="uneditable-text">{label}: </span>}
          {linkedResource ? (
            <>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (popupState) onOpenNestedPopup(linkedResource.id, e, popupState);
                    }}
                    className="editable-placeholder text-primary hover:underline"
                >
                    {linkedResource.name}
                </button>
                <button onClick={handleUnlink} className="inline-block opacity-0 group-hover/response:opacity-100 transition-opacity ml-1">
                    <Unlink className="h-3 w-3 text-destructive" />
                </button>
            </>
          ) : (
            <>
              <EditableField
                field={field}
                subField="text"
                prefix=""
                resource={resource}
                onUpdate={onUpdate}
                placeholder="..."
              />
              <Popover>
                <PopoverTrigger asChild>
                    <button className="inline-block opacity-0 group-hover/response:opacity-100 transition-opacity ml-1">
                        <LinkIcon className="h-3 w-3" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0">
                    <Select onValueChange={(val) => handleUpdateField({ text: '', resourceId: val })}>
                        <SelectTrigger className="w-full border-0 focus:ring-0">
                            <SelectValue placeholder="Link a mechanism..." />
                        </SelectTrigger>
                        <SelectContent>
                            {resources.filter(r => r.type === 'mechanism').map(r => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
    );
};

export const EditableResourcePoint = ({ point, onConvertToCard, onUpdate, onDelete, onOpenNestedPopup, onOpenContentView, onEditLinkText, dragHandle, onSeekTo, currentTime, onSetEndTime, onClearEndTime }: { 
    point: ResourcePoint, 
    onUpdate: (pointId: string, updatedPoint: Partial<ResourcePoint>) => void, 
    onDelete: () => void,
    onOpenNestedPopup: (event: React.MouseEvent) => void;
    onOpenContentView: (event: React.MouseEvent) => void;
    onConvertToCard: () => void;
    onEditLinkText?: (point: ResourcePoint) => void;
    dragHandle?: { attributes: any; listeners: any };
    onSeekTo: (timestamp: number) => void;
    currentTime: number;
    onSetEndTime: () => void;
    onClearEndTime: () => void;
}) => {
    const { setFloatingVideoUrl, openBrainHackPopup } = useAuth();
    
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
    
    const handleLinkClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (point.text && point.text.startsWith('brainhack://')) {
            const hackId = point.text.replace('brainhack://', '');
            openBrainHackPopup(hackId, e);
        } else if (point.text) {
            setFloatingVideoUrl(point.text);
        }
    };
    
    const isActiveTimestamp = point.timestamp !== undefined && currentTime >= point.timestamp && (point.endTime === undefined || currentTime <= point.endTime);

    return (
        <li className={`flex items-start gap-3 group/item w-full p-1 rounded-md ${isActiveTimestamp ? 'bg-primary/10' : ''}`}>
            <div className="pt-1.5" {...dragHandle?.attributes} {...dragHandle?.listeners}>
                {point.type === 'code' ? <Code className="h-4 w-4 text-primary/70 flex-shrink-0" /> :
                point.type === 'markdown' ? <MessageSquare className="h-4 w-4 text-primary/70 flex-shrink-0" /> :
                point.type === 'link' ? <LinkIcon className="h-4 w-4 text-primary/70 flex-shrink-0" /> :
                point.type === 'timestamp' ? (
                    <button onClick={() => point.timestamp && onSeekTo(point.timestamp)} className="font-mono text-primary font-semibold text-xs mt-1.5 flex-shrink-0">
                        {formatTime(point.timestamp || 0)}
                    </button>
                ) :
                <ArrowRight className="h-4 w-4 text-primary/50 flex-shrink-0" />
                }
            </div>
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
                            onClick={handleLinkClick}
                            onContextMenu={(e) => { e.preventDefault(); onEditLinkText?.(point); }}
                        >
                            {isFetchingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : (point.displayText || point.text || <span className="text-muted-foreground italic">New link...</span>)}
                        </span>
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap break-words">{point.text}</p>
                )}
            </div>
            <div className="flex items-center flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                 {point.type === 'timestamp' && (
                    <div className="flex items-center gap-1">
                        {point.endTime ? (
                            <>
                                <span className="font-mono text-primary font-semibold text-xs"> - {formatTime(point.endTime)}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearEndTime}><X className="h-3 w-3"/></Button>
                            </>
                        ) : (
                            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={onSetEndTime}>Set End</Button>
                        )}
                    </div>
                )}
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
};
