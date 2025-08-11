
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, Link as LinkIcon, MoreVertical } from 'lucide-react';
import { EditableField, DoubleEditableField, EmotionEditableField } from './EditableFields';
import type { Resource, PopupState } from '@/types/workout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

interface MechanismResourceCardProps {
    resource: Resource;
    onUpdate: (updatedResource: Resource) => void;
    onDelete: (resourceId: string) => void;
    onLinkClick: (resourceId: string) => void;
    linkingFromId: string | null;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;
}

export function MechanismResourceCard({ resource, onUpdate, onDelete, onLinkClick, linkingFromId, onOpenNestedPopup }: MechanismResourceCardProps) {

    const handleFrameworkChange = (value: 'negative' | 'positive') => {
        onUpdate({ ...resource, mechanismFramework: value });
    };

    return (
        <Card className="flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="flex items-center gap-3 text-lg">
                        <span className="text-primary"><Workflow className="h-5 w-5" /></span>
                        <EditableField field="name" prefix="" resource={resource} onUpdate={onUpdate} placeholder="Mechanism Name..." />
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
                <RadioGroup value={resource.mechanismFramework || 'negative'} onValueChange={handleFrameworkChange} className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="negative" id={`neg-${resource.id}`} /><Label htmlFor={`neg-${resource.id}`}>Negative Framework</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="positive" id={`pos-${resource.id}`} /><Label htmlFor={`pos-${resource.id}`}>Positive Framework</Label></div>
                </RadioGroup>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 {resource.mechanismFramework === 'positive' ? (
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
                )}
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">Double-click any text to edit.</p>
            </CardFooter>
        </Card>
    );
}

    