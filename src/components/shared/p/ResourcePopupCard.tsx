
"use client";

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Library, MessageSquare, Code, ArrowRight, X } from 'lucide-react';
import type { Resource, ResourcePoint } from '@/types/workout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDraggable } from '@dnd-kit/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PopupState {
  resourceId: string;
  level: number;
  x: number;
  y: number;
  parentId?: string;
  width?: number;
  height?: number;
}

interface ResourcePopupProps {
  popupState: PopupState;
  allResources: Resource[];
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState: PopupState) => void;
  onClose: (resourceId: string) => void;
  onSizeChange: (resourceId: string, newSize: { width: number; height: number }) => void;
}

export const ResourcePopupCard = ({ popupState, allResources, onOpenNestedPopup, onClose, onSizeChange }: ResourcePopupProps) => {
    const resource = allResources.find(r => r.id === popupState.resourceId);
    const cardRef = useRef<HTMLDivElement>(null);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `popup-${popupState.resourceId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        width: `${popupState.width}px`,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    if (!resource) return null;

    const handleLinkClick = (e: React.MouseEvent, pointResourceId: string) => {
      e.stopPropagation();
      onOpenNestedPopup(pointResourceId, e, popupState);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[60]">
            <Card ref={cardRef} className="shadow-2xl border-2 border-primary/50 bg-card max-h-[70vh] flex flex-col">
                <CardHeader className="p-3 relative cursor-grab flex-shrink-0" {...listeners}>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Library className="h-4 w-4" />
                        <span className="truncate">{resource.name}</span>
                    </CardTitle>
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-3 pt-0">
                        <ul className="space-y-2 text-sm text-muted-foreground pr-2">
                            {(resource.points || []).map(point => (
                                <li key={point.id} className="flex items-start gap-2">
                                    {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                    point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary/50 flex-shrink-0" />
                                    }
                                    {point.type === 'card' && point.resourceId ? (
                                        <button
                                            onClick={(e) => handleLinkClick(e, point.resourceId!)}
                                            className="text-left font-medium text-primary hover:underline"
                                        >
                                            {point.text}
                                        </button>
                                    ) : point.type === 'markdown' ? (
                                        <div className="w-full prose dark:prose-invert prose-sm">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown>
                                        </div>
                                    ) : point.type === 'code' ? (
                                         <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '0.5rem', borderRadius: '0.375rem', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} codeTagProps={{style: {fontSize: '0.8rem', fontFamily: 'monospace'}}}>
                                            {point.text || ""}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <span className="break-words w-full" title={point.text}>{point.text}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </div>
                 <div className="p-2 flex justify-end flex-shrink-0 relative">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onClose(resource.id); }}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </Card>
        </div>
    );
};
