
"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Link as LinkIcon, MoreVertical } from 'lucide-react';
import AudioMiniPlayer from './AudioMiniPlayer';
import { EditableField, EditableResponse } from './EditableFields';
import type { Resource, PopupState } from '@/types/workout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

const HABIT_STATE_OPTIONS = ['Health', 'Wealth', 'Relations', 'Meaning', 'Creativity', 'Contribution'] as const;

interface HabitResourceCardProps {
    resource: Resource;
    onUpdate: (updatedResource: Resource) => void;
    onDelete: (resourceId: string) => void;
    onLinkClick: (resourceId: string) => void;
    linkingFromId: string | null;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;
}

export function HabitResourceCard({ resource, onUpdate, onDelete, onLinkClick, linkingFromId, onOpenNestedPopup }: HabitResourceCardProps) {
    const { mindsetCards, mechanismCards } = useAuth();
    const [isBotheringPickerOpen, setIsBotheringPickerOpen] = React.useState(false);
    const [botheringTab, setBotheringTab] = React.useState<'mismatch' | 'constraint' | 'external'>(
        resource.linkedBotheringType || 'external'
    );
    const botheringOptions = React.useMemo(
        () => (mindsetCards || []).flatMap((card) =>
            (card.points || []).map((point) => ({
                id: point.id,
                text: point.text || 'Untitled bothering',
                source: card.id.replace('mindset_botherings_', '') as 'mismatch' | 'constraint' | 'external',
                completed: !!point.completed,
                endDate: point.endDate || '',
                taskCount: Array.isArray(point.tasks) ? point.tasks.length : 0,
            }))
        ),
        [mindsetCards]
    );
    const linkedBothering = React.useMemo(
        () => botheringOptions.find((option) => option.id === resource.linkedBotheringId) || null,
        [botheringOptions, resource.linkedBotheringId]
    );
    const botheringsByType = React.useMemo(
        () => ({
            mismatch: botheringOptions.filter((item) => item.source === 'mismatch'),
            constraint: botheringOptions.filter((item) => item.source === 'constraint'),
            external: botheringOptions.filter((item) => item.source === 'external'),
        }),
        [botheringOptions]
    );
    const negativeMechanism = React.useMemo(
        () => mechanismCards.find((item) => item.id === resource.response?.resourceId) || null,
        [mechanismCards, resource.response?.resourceId]
    );
    const positiveMechanism = React.useMemo(
        () => mechanismCards.find((item) => item.id === resource.newResponse?.resourceId) || null,
        [mechanismCards, resource.newResponse?.resourceId]
    );
    const negativeCost = negativeMechanism?.benefit || negativeMechanism?.reward || '';
    const positiveBenefit = positiveMechanism?.benefit || positiveMechanism?.reward || '';

    const openBotheringSelector = () => {
        setBotheringTab(resource.linkedBotheringType || 'external');
        setIsBotheringPickerOpen(true);
    };

    const handleSelectBothering = (botheringId: string, botheringType: 'mismatch' | 'constraint' | 'external') => {
        onUpdate({
            ...resource,
            linkedBotheringId: botheringId,
            linkedBotheringType: botheringType,
        });
        setIsBotheringPickerOpen(false);
    };

    const openLinkedBothering = () => {
        if (!resource.linkedBotheringId || !resource.linkedBotheringType) return;
        window.dispatchEvent(new CustomEvent('open-bothering-popup', {
            detail: {
                type: resource.linkedBotheringType,
                pointId: resource.linkedBotheringId,
            },
        }));
    };

    const renderBotheringList = (type: 'mismatch' | 'constraint' | 'external') => (
        <ScrollArea className="h-[360px] pr-2">
            <div className="space-y-2">
                {botheringsByType[type].map((bothering) => {
                    const isSelected = resource.linkedBotheringId === bothering.id;
                    return (
                        <button
                            key={bothering.id}
                            type="button"
                            onClick={() => handleSelectBothering(bothering.id, type)}
                            className={cn(
                                "w-full rounded-xl border p-3 text-left transition-colors",
                                isSelected
                                    ? "border-primary/50 bg-primary/10"
                                    : "border-border/60 bg-muted/10 hover:bg-muted/20"
                            )}
                        >
                            <div className="font-medium">{bothering.text}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{bothering.endDate || 'No end date'}</span>
                                <span>{bothering.taskCount} task{bothering.taskCount === 1 ? '' : 's'}</span>
                                {!bothering.completed && <span className="h-2 w-2 rounded-full bg-emerald-400/80" />}
                            </div>
                        </button>
                    );
                })}
                {botheringsByType[type].length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No botherings in this section.</p>
                )}
            </div>
        </ScrollArea>
    );

    return (
        <>
            <Card className="flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
                <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="flex items-center gap-3 text-lg">
                            <span className="text-primary"><Zap className="h-5 w-5" /></span>
                            <EditableField field="name" prefix="" resource={resource} onUpdate={onUpdate} placeholder="Habit Name..." />
                        </CardTitle>
                        <div className="flex items-center">
                            {resource.hasLocalAudio && (
                                <AudioMiniPlayer resource={resource} />
                            )}
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
                    <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">State</div>
                        <Select
                            value={resource.state || ''}
                            onValueChange={(value) => onUpdate({ ...resource, state: value })}
                        >
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent className="z-[220]">
                                {HABIT_STATE_OPTIONS.map((state) => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Link Bothering</div>
                        <div className="mt-2 space-y-2">
                            <Button type="button" variant="outline" className="w-full justify-start" onClick={openBotheringSelector}>
                                {linkedBothering ? 'Change linked bothering' : 'Select from botherings'}
                            </Button>
                            {linkedBothering ? (
                                <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                                    <button type="button" className="w-full text-left text-sm hover:underline" onClick={openLinkedBothering}>
                                        {linkedBothering.text}
                                    </button>
                                    <div className="mt-1 text-xs text-muted-foreground">{linkedBothering.source}</div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="mt-1 h-7 px-2 text-xs text-muted-foreground"
                                        onClick={() => onUpdate({ ...resource, linkedBotheringId: undefined, linkedBotheringType: undefined })}
                                    >
                                        Clear link
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">No bothering linked.</p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Trigger:</p>
                        <EditableField field="trigger" subField="action" prefix="When I" suffix="." resource={resource} onUpdate={onUpdate} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Negative:</p>
                        <EditableResponse field="response" label="" resource={resource} onUpdate={onUpdate} onOpenNestedPopup={onOpenNestedPopup} />
                        {negativeCost ? (
                            <p className="text-xs text-muted-foreground">Cost: {negativeCost}</p>
                        ) : null}
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Positive:</p>
                        <EditableResponse field="newResponse" label="" resource={resource} onUpdate={onUpdate} onOpenNestedPopup={onOpenNestedPopup} />
                        {positiveBenefit ? (
                            <p className="text-xs text-muted-foreground">Benefit: {positiveBenefit}</p>
                        ) : null}
                    </div>
                </CardContent>
                <CardFooter>
                     <p className="text-xs text-muted-foreground">Double-click any text to edit.</p>
                </CardFooter>
            </Card>

            <Dialog open={isBotheringPickerOpen} onOpenChange={setIsBotheringPickerOpen}>
                <DialogContent className="z-[220] sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>Botherings</DialogTitle>
                    </DialogHeader>
                    <Tabs value={botheringTab} onValueChange={(value) => setBotheringTab(value as 'mismatch' | 'constraint' | 'external')}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="mismatch">Mismatch</TabsTrigger>
                            <TabsTrigger value="constraint">Constraint</TabsTrigger>
                            <TabsTrigger value="external">External</TabsTrigger>
                        </TabsList>
                        <TabsContent value="mismatch" className="pt-4">
                            {renderBotheringList('mismatch')}
                        </TabsContent>
                        <TabsContent value="constraint" className="pt-4">
                            {renderBotheringList('constraint')}
                        </TabsContent>
                        <TabsContent value="external" className="pt-4">
                            {renderBotheringList('external')}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    );
}

    
