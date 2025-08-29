
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Link as LinkIcon, MoreVertical } from 'lucide-react';
import { EditableField, EditableResponse } from './EditableFields';
import type { Resource, PopupState } from '@/types/workout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface HabitResourceCardProps {
    resource: Resource;
    onUpdate: (updatedResource: Resource) => void;
    onDelete: (resourceId: string) => void;
    onLinkClick: (resourceId: string) => void;
    linkingFromId: string | null;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;
}

export function HabitResourceCard({ resource, onUpdate, onDelete, onLinkClick, linkingFromId, onOpenNestedPopup }: HabitResourceCardProps) {
    return (
        <Card className="flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="flex items-center gap-3 text-lg">
                        <span className="text-primary"><Zap className="h-5 w-5" /></span>
                        <EditableField field="name" prefix="" resource={resource} onUpdate={onUpdate} placeholder="Habit Name..." />
                    </CardTitle>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onLinkClick(resource.id)}>
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => onDelete(resource.id)} className="text-destructive">Delete Card</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
                <EditableField field="trigger" subField="action" prefix="Trigger: When I" suffix="." resource={resource} onUpdate={onUpdate} />
                <div className="editable-sentence">
                    <span contentEditable={false} className="font-bold text-foreground">
                        <EditableResponse field="response" label="" resource={resource} onUpdate={onUpdate} onOpenNestedPopup={onOpenNestedPopup} />
                    </span>
                </div>
                <EditableField field="reward" prefix="Reward:" resource={resource} onUpdate={onUpdate} />
                <EditableResponse field="newResponse" label="New Response" resource={resource} onUpdate={onUpdate} onOpenNestedPopup={onOpenNestedPopup} />
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground">Double-click any text to edit.</p>
            </CardFooter>
        </Card>
    );
}

    
