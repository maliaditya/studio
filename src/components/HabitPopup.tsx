
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, X } from 'lucide-react';
import type { Resource } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';

interface HabitPopupProps {
    habit: Resource;
    onOpenChange: (isOpen: boolean) => void;
}

const EditableField = ({ label, value, placeholder = "..." }: { label: string; value?: string; placeholder?: string }) => (
    <div>
        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</h4>
        <p className="text-sm text-foreground">{value || <span className="italic text-muted-foreground">{placeholder}</span>}</p>
    </div>
);

const LinkedMechanismField = ({ label, resourceId, resourceName }: { label: string; resourceId?: string; resourceName?: string }) => {
    const { handleOpenNestedPopup } = useAuth(); // Assuming this can open resource popups
    
    if (resourceId && resourceName) {
        return (
            <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</h4>
                <button 
                    onClick={(e) => handleOpenNestedPopup(resourceId, e)}
                    className="text-sm text-primary hover:underline text-left"
                >
                    {resourceName}
                </button>
            </div>
        );
    }
    
    return <EditableField label={label} value={resourceName} placeholder="Not linked" />;
}

export function HabitPopup({ habit, onOpenChange }: HabitPopupProps) {
    const { resources } = useAuth();

    const responseMechanism = habit.response?.resourceId ? resources.find(r => r.id === habit.response.resourceId) : null;
    const newResponseMechanism = habit.newResponse?.resourceId ? resources.find(r => r.id === habit.newResponse.resourceId) : null;

    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary"/>
                        Habit: {habit.name}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-4">
                            <EditableField label="Trigger" value={habit.trigger?.action} placeholder="When I..." />
                            
                            {responseMechanism ? 
                                <LinkedMechanismField label="Response" resourceId={responseMechanism.id} resourceName={responseMechanism.name}/> : 
                                <EditableField label="Response" value={habit.response?.text} placeholder="I will..." />
                            }

                            <EditableField label="Reward" value={habit.reward} placeholder="And I will get..." />
                            
                            <div className="flex items-center justify-center my-4">
                               <ArrowRight className="h-6 w-6 text-muted-foreground" />
                            </div>

                            {newResponseMechanism ? 
                                <LinkedMechanismField label="New Response" resourceId={newResponseMechanism.id} resourceName={newResponseMechanism.name}/> : 
                                <EditableField label="New Response" value={habit.newResponse?.text} placeholder="Instead, I will..." />
                            }
                        </div>
                    </ScrollArea>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

