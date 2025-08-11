"use client";

import React, { useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from './ui/input';
import { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Link as LinkIcon, Unlink } from 'lucide-react';

export const EditableField = ({ field, subField, prefix, suffix, resource, onUpdate, placeholder = "..." }: { 
    field: keyof Resource, 
    subField?: string, 
    prefix: string, 
    suffix?: string, 
    resource: Resource, 
    onUpdate: (updatedResource: Resource) => void,
    placeholder?: string,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    
    const handleBlur = () => {
        if (!editorRef.current) return;
        const editableSpan = editorRef.current.querySelector<HTMLSpanElement>('[contenteditable=true]');
        const newValue = editableSpan?.textContent || '';
        
        let currentValue = '';
        if (subField && typeof resource[field] === 'object' && resource[field] !== null) {
            currentValue = (resource[field] as any)[subField] || '';
        } else {
            currentValue = (resource[field] as string) || '';
        }

        if (newValue !== currentValue) {
            let updatedResource = { ...resource };
            if (subField && typeof updatedResource[field] === 'object' && updatedResource[field] !== null) {
                updatedResource[field] = { ...(updatedResource[field] as object), [subField]: newValue };
            } else if (subField) { // If subField exists but the field is not an object
                 updatedResource[field] = { [subField]: newValue } as any;
            } else {
                updatedResource[field] = newValue as any;
            }
            onUpdate(updatedResource);
        }
    };
    
    let displayValue = '';
    if (subField && typeof resource[field] === 'object' && resource[field] !== null) {
      displayValue = (resource[field] as any)[subField] || '';
    } else {
      displayValue = (resource[field] as string) || '';
    }

    return (
        <div 
          ref={editorRef}
          onBlur={handleBlur}
          className="editable-sentence"
        >
          <span contentEditable={false} className="uneditable-text">{prefix}</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: displayValue || placeholder }} 
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
    const editorRef = useRef<HTMLDivElement>(null);
    
    const handleBlur = () => {
        if (!editorRef.current) return;
        const editableSpans = editorRef.current.querySelectorAll<HTMLSpanElement>('[contenteditable=true]');
        const newValue1 = editableSpans[0]?.textContent || '';
        const newValue2 = editableSpans[1]?.textContent || '';
        if (newValue1 !== value1) onUpdate1(newValue1);
        if (newValue2 !== value2) onUpdate2(newValue2);
    };

    return (
        <div 
          ref={editorRef}
          onBlur={handleBlur}
          className="editable-sentence"
        >
          <span contentEditable={false} className="uneditable-text">{prefix}</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: value1 || placeholder1 }} 
          />
          <span contentEditable={false} className="uneditable-text">{infix}</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: value2 || placeholder2 }} 
          />
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
    const editorRef = useRef<HTMLDivElement>(null);
    
    const handleBlur = () => {
        if (!editorRef.current) return;
        const editableSpans = editorRef.current.querySelectorAll<HTMLSpanElement>('[contenteditable=true]');
        const newValue1 = editableSpans[0]?.textContent || '';
        const newValue2 = editableSpans[1]?.textContent || '';
        if (newValue1 !== value1) onUpdate1(newValue1);
        if (newValue2 !== value2) onUpdate2(newValue2);
    };

    return (
        <div 
          ref={editorRef}
          onBlur={handleBlur}
          className="editable-sentence"
        >
          <span contentEditable={false} className="uneditable-text">That one </span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: value1 || placeholder1 }} 
          />
          <span contentEditable={false} className="uneditable-text">{label}</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: value2 || placeholder2 }} 
          />
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
        onUpdate({ ...resource, [field]: { ...responseValue, text: '', resourceId: undefined } });
    };
  
    const handleUpdateField = (value: { text?: string; resourceId?: string }) => {
        onUpdate({ ...resource, [field]: value });
    };

    return (
        <div className="editable-sentence group/response">
          <span contentEditable={false} className="uneditable-text">{label}:</span>
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
