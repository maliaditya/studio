"use client";

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, X, GripVertical } from 'lucide-react';
import type { Resource } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { useDraggable } from '@dnd-kit/core';

interface HabitPopupProps {
    habit: Resource;
    onClose: () => void;
    position: { x: number; y: number };
}

const EditableField = ({ label, value, placeholder = "..." }: { label: string; value?: string; placeholder?: string }) => (
    <div>
        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</h4>
        <p className="text-sm text-foreground">{value || <span className="italic text-muted-foreground">{placeholder}</span>}</p>
    </div>
);

const LinkedMechanismField = ({ label, resourceId, resourceName, onOpenNestedPopup }: { label: string; resourceId?: string; resourceName?: string, onOpenNestedPopup: (e: React.MouseEvent) => void; }) => {
    if (resourceId && resourceName) {
        return (
            <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</h4>
                <button onClick={onOpenNestedPopup} className="text-sm text-primary hover:underline">{resourceName}</button>
            </div>
        );
    }
    
    return <EditableField label={label} value={resourceName} placeholder="Not linked" />;
}

export function HabitPopup({ habit, onClose, position }: HabitPopupProps) {
    const { resources, handleOpenNestedPopup } = useAuth();
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `habit-popup-${habit.id}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 55, // High z-index to be on top
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    const responseMechanism = habit.response?.resourceId ? resources.find(r => r.id === habit.response.resourceId) : null;
    const newResponseMechanism = habit.newResponse?.resourceId ? resources.find(r => r.id === habit.newResponse.resourceId) : null;

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card max-h-[80vh] flex flex-col">
                 <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-grow">
                           <Zap className="h-5 w-5 text-primary"/> 
                           <CardTitle className="text-base truncate">{habit.name}</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => { e.stopPropagation(); onClose();}}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-grow min-h-0">
                    <ScrollArea className="h-full pr-2">
                        <div className="space-y-4">
                            <EditableField label="Trigger" value={habit.trigger?.action} placeholder="When I..." />
                            
                            <LinkedMechanismField 
                                label="Response" 
                                resourceId={responseMechanism?.id} 
                                resourceName={responseMechanism?.name || habit.response?.text}
                                onOpenNestedPopup={(e) => responseMechanism && handleOpenNestedPopup(responseMechanism.id, e)}
                            />

                            <EditableField label="Reward" value={habit.reward} placeholder="And I will get..." />
                            
                            <LinkedMechanismField 
                                label="New Response" 
                                resourceId={newResponseMechanism?.id} 
                                resourceName={newResponseMechanism?.name || habit.newResponse?.text}
                                onOpenNestedPopup={(e) => newResponseMechanism && handleOpenNestedPopup(newResponseMechanism.id, e)}
                            />
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

