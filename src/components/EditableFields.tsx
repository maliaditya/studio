
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from './ui/input';
import { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Link as LinkIcon, Unlink, Trash2, Code, MessageSquare, ArrowRight, Blocks, Loader2, X, Paintbrush, Plus, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare2, GripVertical, Type, Share2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';

export const RESOURCE_BLOCK_OPTIONS: Array<{
    value: ResourcePoint['type'];
    label: string;
}> = [
    { value: 'text', label: 'Text' },
    { value: 'ai-note', label: 'AI Note' },
    { value: 'heading1', label: 'Heading 1' },
    { value: 'heading2', label: 'Heading 2' },
    { value: 'heading3', label: 'Heading 3' },
    { value: 'bulleted-list', label: 'Bulleted list' },
    { value: 'numbered-list', label: 'Numbered list' },
    { value: 'todo', label: 'To-do list' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'code', label: 'Code' },
    { value: 'link', label: 'Link' },
    { value: 'paint', label: 'Paint Canvas' },
];

type BlockMenuOption = {
    value: ResourcePoint['type'];
    label: string;
    hint: string;
    section: 'suggested' | 'basic' | 'advanced';
    icon: React.ReactNode;
};

const RESOURCE_BLOCK_MENU_OPTIONS: BlockMenuOption[] = [
    { value: 'numbered-list', label: 'Numbered list', hint: '1.', section: 'suggested', icon: <ListOrdered className="h-4 w-4" /> },
    { value: 'todo', label: 'To-do list', hint: '[]', section: 'suggested', icon: <CheckSquare2 className="h-4 w-4" /> },
    { value: 'bulleted-list', label: 'Bulleted list', hint: '-', section: 'suggested', icon: <List className="h-4 w-4" /> },
    { value: 'text', label: 'Text', hint: '', section: 'basic', icon: <Type className="h-4 w-4" /> },
    { value: 'ai-note', label: 'AI Note', hint: 'ai', section: 'basic', icon: <MessageSquare className="h-4 w-4" /> },
    { value: 'heading1', label: 'Heading 1', hint: '#', section: 'basic', icon: <Heading1 className="h-4 w-4" /> },
    { value: 'heading2', label: 'Heading 2', hint: '##', section: 'basic', icon: <Heading2 className="h-4 w-4" /> },
    { value: 'heading3', label: 'Heading 3', hint: '###', section: 'basic', icon: <Heading3 className="h-4 w-4" /> },
    { value: 'markdown', label: 'Markdown', hint: 'md', section: 'advanced', icon: <MessageSquare className="h-4 w-4" /> },
    { value: 'code', label: 'Code', hint: '</>', section: 'advanced', icon: <Code className="h-4 w-4" /> },
    { value: 'link', label: 'Link', hint: '@', section: 'advanced', icon: <LinkIcon className="h-4 w-4" /> },
    { value: 'paint', label: 'Paint Canvas', hint: '', section: 'advanced', icon: <Paintbrush className="h-4 w-4" /> },
];

export const ResourceBlockMenu = ({
    onSelect,
    onClose,
    allowedValues,
}: {
    onSelect: (type: ResourcePoint['type']) => void;
    onClose?: () => void;
    allowedValues?: Array<ResourcePoint['type'] | undefined>;
}) => {
    const allowed = allowedValues ? new Set(allowedValues.filter(Boolean)) : null;
    const options = RESOURCE_BLOCK_MENU_OPTIONS.filter((option) => !allowed || allowed.has(option.value));
    const sections: Array<{ key: BlockMenuOption['section']; label: string }> = [
        { key: 'suggested', label: 'Suggested' },
        { key: 'basic', label: 'Basic blocks' },
        { key: 'advanced', label: 'Advanced' },
    ];
    const rootRef = useRef<HTMLDivElement>(null);
    const shortcutBufferRef = useRef('');
    const shortcutTimerRef = useRef<number | null>(null);

    useEffect(() => {
        rootRef.current?.focus();
        return () => {
            if (shortcutTimerRef.current !== null) {
                window.clearTimeout(shortcutTimerRef.current);
            }
        };
    }, []);

    const resetShortcutBuffer = () => {
        shortcutBufferRef.current = '';
        if (shortcutTimerRef.current !== null) {
            window.clearTimeout(shortcutTimerRef.current);
            shortcutTimerRef.current = null;
        }
    };

    const restartShortcutTimer = () => {
        if (shortcutTimerRef.current !== null) {
            window.clearTimeout(shortcutTimerRef.current);
        }
        shortcutTimerRef.current = window.setTimeout(() => {
            shortcutBufferRef.current = '';
            shortcutTimerRef.current = null;
        }, 800);
    };

    const selectOption = (type: ResourcePoint['type']) => {
        resetShortcutBuffer();
        onClose?.();
        onSelect(type || 'text');
    };

    const shortcutOptions = options
        .filter((option) => option.hint)
        .sort((a, b) => b.hint.length - a.hint.length);

    const handleShortcutKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            resetShortcutBuffer();
            onClose?.();
            return;
        }

        if (event.key === 'Backspace') {
            event.preventDefault();
            shortcutBufferRef.current = shortcutBufferRef.current.slice(0, -1);
            if (shortcutBufferRef.current) {
                restartShortcutTimer();
            } else {
                resetShortcutBuffer();
            }
            return;
        }

        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        const nextBuffer = `${shortcutBufferRef.current}${event.key}`.toLowerCase();
        const exactMatch = shortcutOptions.find((option) => option.hint.toLowerCase() === nextBuffer);
        if (exactMatch) {
            event.preventDefault();
            selectOption(exactMatch.value || 'text');
            return;
        }

        const hasPrefixMatch = shortcutOptions.some((option) => option.hint.toLowerCase().startsWith(nextBuffer));
        if (hasPrefixMatch) {
            event.preventDefault();
            shortcutBufferRef.current = nextBuffer;
            restartShortcutTimer();
            return;
        }

        const singleKeyMatch = shortcutOptions.find((option) => option.hint.toLowerCase() === event.key.toLowerCase());
        if (singleKeyMatch) {
            event.preventDefault();
            selectOption(singleKeyMatch.value || 'text');
            return;
        }

        resetShortcutBuffer();
    };

    return (
        <div
            ref={rootRef}
            tabIndex={-1}
            onKeyDown={handleShortcutKeyDown}
            className="overflow-hidden rounded-xl border border-border/70 bg-background/95 text-foreground shadow-2xl outline-none backdrop-blur-md"
        >
            <div className="max-h-[22rem] overflow-y-auto p-2">
                {sections.map((section) => {
                    const sectionOptions = options.filter((option) => option.section === section.key);
                    if (sectionOptions.length === 0) return null;
                    return (
                        <div key={section.key} className="pb-2">
                            <div className="px-2 pb-2 pt-1 text-[11px] font-medium text-muted-foreground">
                                {section.label}
                            </div>
                            <div className="space-y-0.5">
                                {sectionOptions.map((option) => (
                                    <button
                                        key={`${section.key}-${String(option.value)}`}
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                                        onClick={() => {
                                            selectOption(option.value || 'text');
                                        }}
                                    >
                                        <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                                            {option.icon}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                        {option.hint ? (
                                            <span className="text-xs text-muted-foreground">{option.hint}</span>
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                            {section.key !== 'advanced' ? <div className="mx-2 mt-2 border-t border-border/60" /> : null}
                        </div>
                    );
                })}
            </div>
            <div className="h-px w-full bg-border/80" />
            <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                <button type="button" className="hover:text-foreground" onClick={() => onClose?.()}>
                    Close menu
                </button>
                <span>esc</span>
            </div>
        </div>
    );
};

const isNotionBlockType = (type?: ResourcePoint['type']) =>
    type === 'text' ||
    type === 'heading1' ||
    type === 'heading2' ||
    type === 'heading3' ||
    type === 'bulleted-list' ||
    type === 'numbered-list' ||
    type === 'todo';

const getBlockPlaceholder = (type?: ResourcePoint['type']) => {
    switch (type) {
        case 'heading1': return 'Heading 1';
        case 'heading2': return 'Heading 2';
        case 'heading3': return 'Heading 3';
        case 'bulleted-list': return 'List item';
        case 'numbered-list': return 'List item';
        case 'todo': return 'To-do';
        default: return 'Type something...';
    }
};

const getBlockTypeFromShortcut = (value: string): ResourcePoint['type'] | null => {
    switch (value.trim().toLowerCase()) {
        case '1.':
            return 'numbered-list';
        case '[]':
            return 'todo';
        case '-':
            return 'bulleted-list';
        case '#':
            return 'heading1';
        case '##':
            return 'heading2';
        case '###':
            return 'heading3';
        case 'ai':
            return 'ai-note';
        case 'md':
            return 'markdown';
        case '@':
            return 'link';
        default:
            return null;
    }
};

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
    const { resources, setResources, openGeneralPopup } = useAuth();
    const responseValue = resource[field];
    const linkedResource = responseValue?.resourceId ? resources.find(r => r.id === responseValue.resourceId) : null;
    const mechanismFramework = field === 'response' ? 'negative' : 'positive';
    const mechanismVerb = field === 'response' ? 'negative' : 'positive';
  
    const handleUnlink = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({ ...resource, [field]: { ...(resource[field] || {}), resourceId: undefined } });
    };
  
    const handleUpdateField = (value: { text?: string; resourceId?: string }) => {
        onUpdate({ ...resource, [field]: { ...(resource[field] || {}), ...value } });
    };

    const handleCreateMechanism = (e: React.MouseEvent) => {
        e.stopPropagation();
        const resourceLabel = field === 'response' ? 'Negative Mechanism' : 'Positive Mechanism';
        const newMechanismId = `res_${Date.now()}`;
        const textSeed = String(responseValue?.text || '').trim();
        const newMechanism: Resource = {
            id: newMechanismId,
            name: `${resource.name} ${resourceLabel}`.trim(),
            folderId: resource.folderId,
            type: 'mechanism',
            createdAt: new Date().toISOString(),
            mechanismFramework,
            trigger: {
                action: textSeed,
            },
            response: mechanismFramework === 'negative'
                ? { visualize: textSeed }
                : undefined,
            newResponse: mechanismFramework === 'positive'
                ? { action: textSeed }
                : undefined,
        };

        setResources((prev) => [...prev, newMechanism]);
        handleUpdateField({ text: '', resourceId: newMechanismId });
        openGeneralPopup(newMechanismId, null, popupState);
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
                <PopoverContent className="w-56 p-0" side="top" align="start" sideOffset={6}>
                    <div className="p-1">
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={handleCreateMechanism}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create {mechanismVerb} mechanism
                        </Button>
                    </div>
                    <Select onValueChange={(val) => handleUpdateField({ text: '', resourceId: val })}>
                        <SelectTrigger className="w-full border-0 focus:ring-0">
                            <SelectValue placeholder="Link a mechanism..." />
                        </SelectTrigger>
                        <SelectContent side="top" align="start" sideOffset={4}>
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

export const EditableResourcePoint = ({ resource, point, onConvertToCard, onUpdate, onDelete, onOpenNestedPopup, onEditLinkText, dragHandle, onSeekTo, currentTime, onSetEndTime, onClearEndTime, onOpenDrawingCanvas, onInsertBelow, onChangeType, blockIndex = 0, autoFocus = false, onAutoFocusConsumed, onFocusPrevious }: { 
    resource?: Resource,
    point: ResourcePoint, 
    onUpdate: (pointId: string, updatedPoint: Partial<ResourcePoint>) => void, 
    onDelete: () => void,
    onOpenNestedPopup: (event: React.MouseEvent) => void;
    onConvertToCard: () => void;
    onEditLinkText?: (point: ResourcePoint) => void;
    dragHandle?: { attributes: any; listeners: any };
    onSeekTo: (timestamp: number) => void;
    currentTime: number;
    onSetEndTime: () => void;
    onClearEndTime: () => void;
    onOpenDrawingCanvas: () => void;
    onInsertBelow?: (pointId: string, type?: ResourcePoint['type']) => void;
    onChangeType?: (pointId: string, type: ResourcePoint['type']) => void;
    blockIndex?: number;
    autoFocus?: boolean;
    onAutoFocusConsumed?: () => void;
    onFocusPrevious?: () => void;
}) => {
    const { setFloatingVideoUrl, openBrainHackPopup } = useAuth();
    const isFeatureTodo = resource?.name?.endsWith(' Features') && point.type === 'todo';
    
    const [isEditing, setIsEditing] = useState(point.text === 'New step...' || !!point.text === false);
    const [editText, setEditText] = useState(point.text);
    const [isFetchingMeta, setIsFetchingMeta] = useState(false);
    const [isInsertMenuOpen, setIsInsertMenuOpen] = useState(false);
    const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = async () => {
        if (editText.trim() === '') {
            if (isNotionBlockType(point.type)) {
                onUpdate(point.id, { text: '' });
                setIsEditing(false);
                return;
            }
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

    useEffect(() => {
        setEditText(point.text);
    }, [point.text]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
        }
    }, [isEditing]);

    useEffect(() => {
        if (autoFocus) {
            setIsEditing(true);
            onAutoFocusConsumed?.();
        }
    }, [autoFocus, onAutoFocusConsumed]);
    
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    }

    const handleBlockKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!isNotionBlockType(point.type)) return;
        if (e.key === ' ' && editText.trim()) {
            const shortcutType = getBlockTypeFromShortcut(editText);
            if (shortcutType) {
                e.preventDefault();
                onChangeType?.(point.id, shortcutType);
                onUpdate(point.id, {
                    text: '',
                    checked: shortcutType === 'todo' ? false : undefined,
                });
                setEditText('');
                return;
            }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const trimmed = editText.trim();
            const isListType =
                point.type === 'bulleted-list' ||
                point.type === 'numbered-list' ||
                point.type === 'todo';

            if (!trimmed && isListType) {
                onChangeType?.(point.id, 'text');
                onUpdate(point.id, { text: '', checked: undefined });
                return;
            }

            const nextType = isListType ? point.type : 'text';
            onUpdate(point.id, { text: trimmed || '', type: point.type });
            onInsertBelow?.(point.id, nextType);
            return;
        }
        if (e.key === 'Backspace' && !editText.trim()) {
            if (point.type && point.type !== 'text') {
                e.preventDefault();
                onChangeType?.(point.id, 'text');
                return;
            }
            e.preventDefault();
            onDelete();
            onFocusPrevious?.();
        }
    };

    const renderBlockLead = () => {
        switch (point.type) {
            case 'ai-note':
                return <MessageSquare className="h-4 w-4 text-sky-400 flex-shrink-0" />;
            case 'heading1':
                return <Heading1 className="h-4 w-4 text-muted-foreground" />;
            case 'heading2':
                return <Heading2 className="h-4 w-4 text-muted-foreground" />;
            case 'heading3':
                return <Heading3 className="h-4 w-4 text-muted-foreground" />;
            case 'bulleted-list':
                return <List className="h-4 w-4 text-muted-foreground" />;
            case 'numbered-list':
                return <span className="text-xs font-semibold text-muted-foreground">{blockIndex + 1}.</span>;
            case 'todo':
                return (
                    <Checkbox
                        checked={Boolean(point.checked)}
                        onCheckedChange={(checked) => onUpdate(point.id, { checked: Boolean(checked) })}
                        className="mt-0.5"
                    />
                );
            case 'code':
                return <Code className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
            case 'markdown':
                return <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
            case 'link':
                return <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
            case 'paint':
                return <Paintbrush className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
            case 'timestamp':
                return (
                    <button onClick={() => point.timestamp && onSeekTo(point.timestamp)} className="mt-0.5 flex-shrink-0 font-mono text-xs font-semibold text-foreground">
                        {formatTime(point.timestamp || 0)}
                    </button>
                );
            default:
                return <GripVertical className="h-4 w-4 text-muted-foreground/60" />;
        }
    };
    
     if (point.type === 'card' && point.resourceId) {
        return (
            <li className="flex items-start gap-3 group/item py-1">
                <ArrowRight className="mt-1.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <button onClick={onOpenNestedPopup} className="flex-grow text-left font-medium text-foreground hover:underline">
                    {point.text}
                </button>
                 <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 opacity-0 transition-opacity group-hover/item:opacity-100 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3 w-3"/>
                </Button>
            </li>
        )
    }
    
    const handleLinkClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!point.text || !point.text.trim()) {
            setIsEditing(true);
            return;
        }
        if (point.text.startsWith('brainhack://')) {
            const hackId = point.text.replace('brainhack://', '');
            openBrainHackPopup(hackId, e);
        } else {
            setFloatingVideoUrl(point.text);
        }
    };

    const handleLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsEditing(false);
        }
    };
    
    const isActiveTimestamp = point.timestamp !== undefined && currentTime >= point.timestamp && (point.endTime === undefined || currentTime <= point.endTime);
    const isListStyleBlock =
        point.type === 'bulleted-list' ||
        point.type === 'numbered-list' ||
        point.type === 'todo';

    return (
        <li className={cn("group/item flex w-full items-start rounded-md", isListStyleBlock ? "gap-1 py-0" : "gap-2 py-1", isActiveTimestamp && 'bg-muted/50')}>
            <div className={cn("flex shrink-0 items-start gap-0.5", isListStyleBlock ? "w-8 pt-0.5" : "w-12 pt-0.5")}>
                {isNotionBlockType(point.type) && (
                    <Popover open={isInsertMenuOpen} onOpenChange={setIsInsertMenuOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className={cn("h-6 w-6 opacity-0 transition-opacity group-hover/item:opacity-100", isListStyleBlock && "-ml-1")}>
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[220] w-[18rem] border-0 bg-transparent p-0 shadow-none" align="start" side="top" sideOffset={6}>
                            <ResourceBlockMenu
                                onClose={() => setIsInsertMenuOpen(false)}
                                onSelect={(type) => onInsertBelow?.(point.id, type)}
                            />
                        </PopoverContent>
                    </Popover>
                )}
                <div className={cn("flex h-6 items-center justify-center", isListStyleBlock ? "min-w-5" : "min-w-6")} {...dragHandle?.attributes} {...dragHandle?.listeners}>
                    {renderBlockLead()}
                </div>
            </div>
             <div className="flex-grow min-w-0" onClick={() => (isNotionBlockType(point.type) || point.type === 'markdown' || point.type === 'code' || point.type === 'ai-note') && setIsEditing(true)} onDoubleClick={() => !isEditing && setIsEditing(true)}>
                {isEditing && (isNotionBlockType(point.type) || point.type === 'markdown' || point.type === 'code' || point.type === 'ai-note') ? (
                    <Textarea
                        ref={textareaRef}
                        value={editText}
                        onChange={handleTextareaChange}
                        onBlur={handleSave}
                        onKeyDown={(e) => {
                          if (point.type === 'markdown' || point.type === 'code' || point.type === 'ai-note') {
                            // For markdown/code: Ctrl+Enter to save, Escape to cancel
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              handleSave();
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setIsEditing(false);
                            }
                          } else {
                            // For notion blocks: use the block keydown handler
                            handleBlockKeyDown(e);
                          }
                        }}
                        className={cn(
                            "min-h-0 resize-none border-0 bg-transparent p-0 text-sm shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-transparent",
                            isListStyleBlock && "pt-0.5",
                            point.type === 'heading1' && "text-2xl font-semibold leading-tight",
                            point.type === 'heading2' && "text-xl font-semibold leading-tight",
                            point.type === 'heading3' && "text-lg font-semibold leading-tight",
                            point.type === 'todo' && point.checked && "text-muted-foreground line-through",
                            (point.type === 'code') && "font-mono text-xs",
                            (point.type === 'markdown' || point.type === 'ai-note') && "min-h-[100px]"
                        )}
                        rows={1}
                        placeholder={getBlockPlaceholder(point.type)}
                    />
                ) : point.type === 'markdown' || point.type === 'code' || point.type === 'ai-note' ? (
                    <div 
                      className="w-full cursor-text rounded-md hover:bg-muted/30 p-2 -m-2 transition-colors"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setIsEditing(true);
                        }
                      }}
                    >
                      {point.type === 'markdown' || point.type === 'ai-note' ? (
                        <div className="prose dark:prose-invert prose-sm max-w-full overflow-hidden">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {point.text || ''}
                          </ReactMarkdown>
                        </div>
                      ) : point.type === 'code' ? (
                        <div className="bg-muted/50 rounded-md border border-muted-foreground/20 overflow-hidden">
                          <SyntaxHighlighter 
                            language="javascript" 
                            style={vscDarkPlus} 
                            customStyle={{ 
                              margin: 0, 
                              padding: '0.5rem', 
                              borderRadius: '0', 
                              width: '100%', 
                              whiteSpace: 'pre-wrap', 
                              wordBreak: 'break-word',
                              maxHeight: '200px',
                              overflow: 'auto'
                            }} 
                            codeTagProps={{style: {fontSize: '0.8rem', fontFamily: 'monospace'}}}
                          >
                            {point.text || ""}
                          </SyntaxHighlighter>
                        </div>
                      ) : null}
                    </div>
                ) : point.type === 'link' ? (
                     <div className="flex-grow min-w-0 flex items-center gap-2">
                        {isEditing ? (
                            <Input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleLinkKeyDown}
                                className="h-7 text-sm flex-grow"
                                placeholder="Paste link..."
                                autoFocus
                            />
                        ) : (
                            <>
                              <a 
                                href={point.text || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer text-primary underline-offset-2 hover:underline font-medium line-clamp-2 flex-grow"
                                onClick={(e) => {
                                  if (!point.text?.startsWith('brainhack://')) {
                                    e.preventDefault();
                                  }
                                  handleLinkClick(e);
                                }}
                              >
                                {isFetchingMeta ? <Loader2 className="h-4 w-4 animate-spin inline" /> : (point.displayText || point.text || <span className="text-muted-foreground italic">New link...</span>)}
                              </a>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditLinkText?.(point);
                                }}
                                title="Edit link text"
                              >
                                <LinkIcon className="h-3 w-3" />
                              </Button>
                            </>
                        )}
                    </div>
                ) : point.type === 'paint' ? (
                    <button
                        onClick={onOpenDrawingCanvas}
                        className="text-left font-medium text-foreground hover:underline"
                    >
                        {point.text || 'Untitled Canvas'}
                    </button>
                ) : isNotionBlockType(point.type) ? (
                    <div
                        className={cn(
                            "min-h-6 whitespace-pre-wrap break-words text-sm text-foreground",
                            isListStyleBlock ? "pt-0.5 leading-[1.35]" : "leading-relaxed",
                            point.type === 'heading1' && "text-2xl font-semibold leading-tight",
                            point.type === 'heading2' && "text-xl font-semibold leading-tight",
                            point.type === 'heading3' && "text-lg font-semibold leading-tight",
                            point.type === 'todo' && point.checked && "text-muted-foreground line-through"
                        )}
                    >
                        {point.text || <span className="text-muted-foreground/60">{getBlockPlaceholder(point.type)}</span>}
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap break-words">{point.text}</p>
                )}
            </div>
            <div className="flex items-center flex-shrink-0 opacity-0 transition-opacity group-hover/item:opacity-100">
                 {point.type === 'timestamp' && (
                    <div className="flex items-center gap-1">
                        {point.endTime ? (
                            <>
                                <span className="font-mono text-xs font-semibold text-muted-foreground"> - {formatTime(point.endTime)}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearEndTime}><X className="h-3 w-3"/></Button>
                            </>
                        ) : (
                            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={onSetEndTime}>Set End</Button>
                        )}
                    </div>
                )}
                {isNotionBlockType(point.type) && (
                    <Popover open={isTypeMenuOpen} onOpenChange={setIsTypeMenuOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                <Blocks className="h-3 w-3"/>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[220] w-[18rem] border-0 bg-transparent p-0 shadow-none" align="end" side="top" sideOffset={6}>
                            <ResourceBlockMenu
                                onClose={() => setIsTypeMenuOpen(false)}
                                onSelect={(type) => onChangeType?.(point.id, type || 'text')}
                            />
                        </PopoverContent>
                    </Popover>
                )}
                {point.type === 'text' && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-foreground" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onConvertToCard();
                        }}
                        title="Convert to linked card"
                    >
                        <ArrowRight className="h-3 w-3"/>
                    </Button>
                )}
                {isFeatureTodo && point.checked ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6", point.readyForBranding ? "text-sky-400 hover:text-sky-300" : "text-muted-foreground hover:text-sky-400")}
                        onClick={() => onUpdate(point.id, { readyForBranding: !point.readyForBranding })}
                        title={point.readyForBranding ? 'Remove from branding' : 'Ready for branding'}
                    >
                        <Share2 className="h-3 w-3"/>
                    </Button>
                ) : null}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3 w-3"/>
                </Button>
            </div>
        </li>
    );
};
