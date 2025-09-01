
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from './ui/input';
import { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Link as LinkIcon, Unlink } from 'lucide-react';

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
