

"use client";

import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GitBranch, Briefcase, BrainCircuit, Blocks, Sprout, Loader2, RefreshCw, Bot } from 'lucide-react';
import type { CoreSkill, SkillArea, Project, SkillDomain, TaskContextPopupState, Activity, MindsetPoint } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { getAiConfigFromSettings, normalizeAiSettings } from '@/lib/ai/config';
import type { TaskBciContext, TaskBciLinkedBothering, TaskBciModel } from '@/lib/taskBci';
import { getEffectiveConstraintTasks } from '@/lib/botheringUtils';

interface TaskContextPopupProps {
    popupState: TaskContextPopupState;
}

type TaskBciState = {
    loading: boolean;
    data: TaskBciModel | null;
    error: string | null;
    usedFallback: boolean;
    providerLabel: string;
};

type TaskScriptState = {
    loading: boolean;
    data: string;
    error: string | null;
    usedFallback: boolean;
    providerLabel: string;
};

const sourceTypeByCardId: Record<string, TaskBciLinkedBothering['type']> = {
    mindset_botherings_external: 'external',
    mindset_botherings_mismatch: 'mismatch',
    mindset_botherings_constraint: 'constraint',
};

const normalizeText = (value: unknown) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

export function TaskContextPopup({ popupState }: TaskContextPopupProps) {
    const { 
        deepWorkDefinitions, 
        upskillDefinitions, 
        projects, 
        coreSkills, 
        skillDomains,
        microSkillMap,
        schedule,
        offerizationPlans,
        skillAcquisitionPlans,
        resources,
        mindsetCards,
        settings,
        findRootTask,
        closeTaskContextPopup,
    } = useAuth();

    const [bciState, setBciState] = useState<TaskBciState>({
        loading: false,
        data: null,
        error: null,
        usedFallback: false,
        providerLabel: '',
    });
    const [scriptState, setScriptState] = useState<TaskScriptState>({
        loading: false,
        data: '',
        error: null,
        usedFallback: false,
        providerLabel: '',
    });
    const popupRef = useRef<HTMLDivElement | null>(null);
    const [popupSize, setPopupSize] = useState({ width: 820, height: 640 });
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `task-context-popup-${popupState.activityId}`,
    });

    const setCombinedRef = useCallback((node: HTMLDivElement | null) => {
        popupRef.current = node;
        setNodeRef(node);
    }, [setNodeRef]);

    useEffect(() => {
        const node = popupRef.current;
        if (!node) return;

        const updateSize = () => {
            const rect = node.getBoundingClientRect();
            setPopupSize((prev) => {
                const nextWidth = Math.round(rect.width);
                const nextHeight = Math.round(rect.height);
                if (prev.width === nextWidth && prev.height === nextHeight) return prev;
                return { width: nextWidth, height: nextHeight };
            });
        };

        updateSize();

        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => updateSize());
        observer.observe(node);
        return () => observer.disconnect();
    }, [popupState.activityId, bciState.data, bciState.error, bciState.loading, scriptState.error, scriptState.loading]);

    const margin = 16;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : popupSize.width + margin * 2;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : popupSize.height + margin * 2;
    const maxLeft = Math.max(margin, viewportWidth - popupSize.width - margin);
    const maxTop = Math.max(margin, viewportHeight - popupSize.height - margin);
    const clampedLeft = Math.min(Math.max(popupState.x, margin), maxLeft);
    const clampedTop = Math.min(Math.max(popupState.y, margin), maxTop);

    const style: React.CSSProperties = {
        position: 'fixed',
        top: clampedTop,
        left: clampedLeft,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        zIndex: 101 + (popupState.level || 0),
    };
    
    const activityInfo = useMemo(() => {
        if (!popupState.activityId) return null;
        for (const dateKey in schedule) {
            for (const slotName in schedule[dateKey]) {
                const activities = schedule[dateKey][slotName] as Activity[];
                if (Array.isArray(activities)) {
                    const foundActivity = activities.find(act => act.id === popupState.activityId);
                    if (foundActivity) return foundActivity;
                }
            }
        }
        return null;
    }, [popupState.activityId, schedule]);

    const taskInfo = useMemo(() => {
        if (!activityInfo) return null;

        const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
        const normalizeLookup = (value?: string) => normalizeText(value).toLowerCase();
        const taskIdCandidates = [
            activityInfo.taskIds?.[0],
            activityInfo.id,
        ]
            .map((value) => String(value || '').trim())
            .filter(Boolean);
        const detailsKey = normalizeLookup(activityInfo.details);
        const task = allDefs.find((definition) =>
            taskIdCandidates.some((candidate) => candidate === definition.id || candidate.startsWith(definition.id)) ||
            (!!detailsKey && normalizeLookup(definition.name) === detailsKey)
        );

        if (!task) return null;

        const parent = allDefs.find(p => 
            (p.linkedDeepWorkIds?.includes(task.id)) || 
            (p.linkedUpskillIds?.includes(task.id))
        );
        
        const linkedProjectId =
            parent?.primaryProjectId ||
            (parent?.linkedProjectIds && parent.linkedProjectIds.length > 0 ? parent.linkedProjectIds[0] : null);
        const linkedProject = linkedProjectId
            ? projects.find(p => p.id === linkedProjectId) 
            : null;

        const microSkillId = Array.from(microSkillMap.entries()).find(([, v]) => v.microSkillName === task.category)?.[0];
        const microSkillInfo = microSkillId ? microSkillMap.get(microSkillId) : null;
        
        let domain: SkillDomain | undefined;
        let coreSkill: CoreSkill | undefined;
        let skillArea: SkillArea | undefined;

        if (microSkillInfo) {
            coreSkill = coreSkills.find(cs => cs.name === microSkillInfo.coreSkillName);
            if (coreSkill) {
                domain = skillDomains.find(d => d.id === coreSkill!.domainId);
                skillArea = coreSkill.skillAreas.find(sa => sa.microSkills.some(ms => ms.id === microSkillId));
            }
        }
        
        return {
            task,
            parent,
            project: linkedProject,
            domain,
            coreSkill,
            skillArea,
        };

    }, [activityInfo, deepWorkDefinitions, upskillDefinitions, projects, coreSkills, skillDomains, microSkillMap]);

    const rootTask = useMemo(() => {
        if (!activityInfo) return null;
        return findRootTask(activityInfo);
    }, [activityInfo, findRootTask]);

    const mismatchPointById = useMemo(() => {
        const mismatchCard = (mindsetCards || []).find((card) => card.id === 'mindset_botherings_mismatch');
        return new Map((mismatchCard?.points || []).map((point) => [point.id, point] as const));
    }, [mindsetCards]);
    const externalPointById = useMemo(() => {
        const externalCard = (mindsetCards || []).find((card) => card.id === 'mindset_botherings_external');
        return new Map((externalCard?.points || []).map((point) => [point.id, point] as const));
    }, [mindsetCards]);

    const linkedBotherings = useMemo(() => {
        if (!activityInfo) return [];

        const currentTaskId = String(taskInfo?.task.id || '');
        const currentActivityId = String(activityInfo.id || '');
        const normalizedTaskName = normalizeText(taskInfo?.task.name || activityInfo.details).toLowerCase();
        const normalizedActivityDetails = normalizeText(activityInfo.details).toLowerCase();

        const matchesTaskRef = (taskRef: NonNullable<MindsetPoint['tasks']>[number]) => {
            const taskRefId = String(taskRef.id || '');
            const taskRefActivityId = String(taskRef.activityId || '');
            const taskRefDetails = normalizeText(taskRef.details).toLowerCase();
            return (
                taskRefActivityId === currentActivityId ||
                taskRefId === currentActivityId ||
                taskRefId === currentTaskId ||
                taskRefActivityId === currentTaskId ||
                (!!taskRefDetails && (
                    taskRefDetails === normalizedTaskName ||
                    taskRefDetails === normalizedActivityDetails
                ))
            );
        };

        const getEffectiveTasks = (point: MindsetPoint, sourceType: TaskBciLinkedBothering['type']) => {
            const directTasks = Array.isArray(point.tasks) ? point.tasks : [];
            if (sourceType !== 'constraint') return directTasks;
            return getEffectiveConstraintTasks(point, mismatchPointById, externalPointById);
        };

        const matches: Array<TaskBciLinkedBothering & { id: string }> = [];
        (mindsetCards || []).forEach((card) => {
            const sourceType = sourceTypeByCardId[card.id];
            if (!sourceType) return;
            (card.points || []).forEach((point) => {
                if (!getEffectiveTasks(point, sourceType).some(matchesTaskRef)) return;
                matches.push({
                    id: point.id,
                    type: sourceType,
                    text: normalizeText(point.text) || 'Untitled bothering',
                    resolution: normalizeText(point.resolution) || undefined,
                    mismatchType: point.mismatchType,
                });
            });
        });

        return matches.filter((entry, index, arr) => arr.findIndex((item) => item.id === entry.id) === index);
    }, [activityInfo, externalPointById, mindsetCards, mismatchPointById, taskInfo]);

    const resolvedSpecialization = useMemo(() => {
        if (!taskInfo) return null;
        if (taskInfo.coreSkill?.type === 'Specialization') return taskInfo.coreSkill;

        const candidates = [
            taskInfo.task.category,
            taskInfo.parent?.category,
            rootTask?.category,
            taskInfo.coreSkill?.name,
        ]
            .map((entry) => normalizeText(entry).toLowerCase())
            .filter(Boolean);

        return (
            coreSkills.find(
                (skill) =>
                    skill.type === 'Specialization' &&
                    candidates.includes(normalizeText(skill.name).toLowerCase())
            ) || null
        );
    }, [coreSkills, rootTask, taskInfo]);

    const learningPlanContext = useMemo(() => {
        const specializationId = resolvedSpecialization?.id;
        if (!specializationId) return null;

        const learningPlan = offerizationPlans?.[specializationId]?.learningPlan;
        const acquisitionPlan = (skillAcquisitionPlans || []).find((plan) => plan.specializationId === specializationId);
        if (!learningPlan && !acquisitionPlan) return null;

        return {
            specializationName: resolvedSpecialization?.name || '',
            targetDate: acquisitionPlan?.targetDate || null,
            requiredHours: acquisitionPlan?.requiredHours ?? null,
            requiredMoney: acquisitionPlan?.requiredMoney ?? null,
            books: (learningPlan?.bookWebpageResources || []).map((resource) => resource.name).filter(Boolean),
            audioVideo: (learningPlan?.audioVideoResources || []).map((resource) => resource.name).filter(Boolean),
            paths: (learningPlan?.skillTreePaths || []).map((path) => path.name).filter(Boolean),
        };
    }, [offerizationPlans, resolvedSpecialization, skillAcquisitionPlans]);

    const projectPlanContext = useMemo(() => {
        if (!taskInfo?.project && !resolvedSpecialization) return null;

        const releasePlans = resolvedSpecialization?.id
            ? offerizationPlans?.[resolvedSpecialization.id]?.releases || []
            : [];
        const workflowStageSummary = releasePlans.flatMap((release) => {
            if (!release.workflowStages) return [];
            return [
                `${release.name}: idea ${release.workflowStages.ideaItems.length}, code ${release.workflowStages.codeItems.length}, break ${release.workflowStages.breakItems.length}, fix ${release.workflowStages.fixItems.length}`,
            ];
        });

        if (!taskInfo?.project?.productPlan && !taskInfo?.project?.name && releasePlans.length === 0) {
            return null;
        }

        return {
            projectName: taskInfo?.project?.name || '',
            targetDate: taskInfo?.project?.productPlan?.targetDate || null,
            requiredHours: taskInfo?.project?.productPlan?.requiredHours ?? null,
            requiredMoney: taskInfo?.project?.productPlan?.requiredMoney ?? null,
            releaseNames: releasePlans.map((release) => release.launchDate ? `${release.name} (${release.launchDate})` : release.name),
            workflowStageSummary: workflowStageSummary.slice(0, 4),
        };
    }, [offerizationPlans, resolvedSpecialization, taskInfo]);

    const linkedResourceNames = useMemo(() => {
        if (!taskInfo) return [];
        const resourceIds = Array.from(
            new Set([
                ...(taskInfo.task.linkedResourceIds || []),
                ...(taskInfo.parent?.linkedResourceIds || []),
                ...(taskInfo.coreSkill?.linkedResourceIds || []),
                ...(taskInfo.coreSkill?.linkedPdfResourceId ? [taskInfo.coreSkill.linkedPdfResourceId] : []),
            ])
        );
        return resourceIds
            .map((resourceId) => resources.find((resource) => resource.id === resourceId)?.name || '')
            .map((name) => normalizeText(name))
            .filter(Boolean);
    }, [resources, taskInfo]);

    const bciContext = useMemo<TaskBciContext | null>(() => {
        if (!activityInfo) return null;
        return {
            taskName: taskInfo?.task.name || activityInfo.details || activityInfo.type,
            taskType: activityInfo.type,
            taskDetails: activityInfo.details || taskInfo?.task.name || activityInfo.type,
            taskDescription: taskInfo?.task.description,
            taskCategory: taskInfo?.task.category || activityInfo.type,
            slotName: activityInfo.slot,
            parentTaskName: taskInfo?.parent?.name,
            rootTaskName: rootTask?.name,
            nodeType: taskInfo?.task.nodeType,
            projectName: taskInfo?.project?.name,
            skillDomainName: taskInfo?.domain?.name,
            coreSkillName: taskInfo?.coreSkill?.name,
            skillAreaName: taskInfo?.skillArea?.name,
            linkedBotherings,
            learningContext: learningPlanContext || undefined,
            projectContext: projectPlanContext || undefined,
            resourceNames: linkedResourceNames,
        };
    }, [activityInfo, learningPlanContext, linkedBotherings, linkedResourceNames, projectPlanContext, rootTask, taskInfo]);

    const isDesktopRuntime =
        typeof window !== 'undefined' &&
        (Boolean((window as any)?.electronAPI) || navigator.userAgent.toLowerCase().includes(' electron/'));

    const aiConfig = useMemo(
        () => getAiConfigFromSettings(settings, isDesktopRuntime),
        [isDesktopRuntime, settings]
    );
    const isAiEnabled = normalizeAiSettings(settings.ai, isDesktopRuntime).provider !== 'none';

    const generateBci = useCallback(
        async (signal?: AbortSignal) => {
            if (!bciContext || !isAiEnabled) return;
            setScriptState({
                loading: false,
                data: '',
                error: null,
                usedFallback: false,
                providerLabel: '',
            });
            setBciState((prev) => ({
                ...prev,
                loading: true,
                error: null,
            }));
            try {
                const response = await fetch('/api/ai/task-bci', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
                    },
                    body: JSON.stringify({
                        context: bciContext,
                        aiConfig,
                    }),
                    signal,
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(String(result?.error || result?.details || 'Failed to generate task context.'));
                }
                setBciState({
                    loading: false,
                    data: result?.bci || null,
                    error: null,
                    usedFallback: Boolean(result?.meta?.usedFallback),
                    providerLabel: [result?.meta?.provider, result?.meta?.model].filter(Boolean).join(' | '),
                });
            } catch (error) {
                if (signal?.aborted) return;
                const message = error instanceof Error ? error.message : 'Failed to generate task context.';
                setBciState({
                    loading: false,
                    data: null,
                    error: message,
                    usedFallback: false,
                    providerLabel: '',
                });
            }
        },
        [aiConfig, bciContext, isAiEnabled, isDesktopRuntime]
    );

    const generateScript = useCallback(
        async (signal?: AbortSignal) => {
            if (!bciContext || !isAiEnabled) return '';
            setScriptState((prev) => ({
                ...prev,
                loading: true,
                error: null,
            }));
            try {
                const response = await fetch('/api/ai/task-convincer-script', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
                    },
                    body: JSON.stringify({
                        context: bciContext,
                        bci: bciState.data,
                        aiConfig,
                    }),
                    signal,
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(String(result?.error || result?.details || 'Failed to generate task script.'));
                }
                const nextScript = String(result?.script || '');
                setScriptState({
                    loading: false,
                    data: nextScript,
                    error: null,
                    usedFallback: Boolean(result?.meta?.usedFallback),
                    providerLabel: [result?.meta?.provider, result?.meta?.model].filter(Boolean).join(' | '),
                });
                return nextScript;
            } catch (error) {
                if (signal?.aborted) return;
                const message = error instanceof Error ? error.message : 'Failed to generate task script.';
                setScriptState({
                    loading: false,
                    data: '',
                    error: message,
                    usedFallback: false,
                    providerLabel: '',
                });
                return '';
            }
        },
        [aiConfig, bciContext, bciState.data, isAiEnabled, isDesktopRuntime]
    );

    useEffect(() => {
        setBciState({
            loading: false,
            data: null,
            error: null,
            usedFallback: false,
            providerLabel: '',
        });
        setScriptState({
            loading: false,
            data: '',
            error: null,
            usedFallback: false,
            providerLabel: '',
        });
    }, [popupState.activityId]);

    useEffect(() => {
        if (!bciContext || !isAiEnabled) return;
        const controller = new AbortController();
        void generateBci(controller.signal);
        return () => controller.abort();
    }, [bciContext, generateBci, isAiEnabled, popupState.activityId]);

    const handleClose = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        closeTaskContextPopup(popupState.activityId);
    };

    const getCoreSkillIcon = (type?: string) => {
      switch(type) {
        case 'Foundation': return <Blocks className="h-4 w-4" />;
        case 'Specialization': return <BrainCircuit className="h-4 w-4" />;
        case 'Professionalism': return <Sprout className="h-4 w-4" />;
        default: return null;
      }
    };
    
    if (!activityInfo) return null;
    const task = taskInfo?.task || null;
    const parent = taskInfo?.parent || null;
    const project = taskInfo?.project || null;
    const domain = taskInfo?.domain || null;
    const coreSkill = taskInfo?.coreSkill || null;
    const skillArea = taskInfo?.skillArea || null;
    const taskLabel = task?.name || activityInfo.details || activityInfo.type;

    const dispatchScriptToAstra = (script: string) => {
        if (typeof window === 'undefined') return;
        const content = String(script || '').trim();
        if (!content) return;
        window.dispatchEvent(
            new CustomEvent('open-astra-task-script', {
                detail: {
                    taskName: taskLabel,
                    content,
                },
            })
        );
    };

    const handleOpenInAstra = async () => {
        if (scriptState.loading) return;
        const existingScript = String(scriptState.data || '').trim();
        if (existingScript) {
            dispatchScriptToAstra(existingScript);
            return;
        }
        const nextScript = await generateScript();
        if (nextScript) {
            dispatchScriptToAstra(nextScript);
        }
    };

    const handleOpenInAstraPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        void handleOpenInAstra();
    };

    const renderBciSection = (title: string, items: string[]) => (
        <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">{title}</Badge>
            </div>
            {items.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, index) => (
                        <li key={`${title}-${index}`} className="flex gap-2">
                            <span className="text-primary">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No {title.toLowerCase()} details generated yet.</p>
            )}
        </div>
    );

    return (
        <div ref={setCombinedRef} style={style} {...attributes}>
            <Card className="w-[min(820px,calc(100vw-32px))] max-h-[calc(100vh-32px)] overflow-y-auto shadow-2xl border-2 border-primary/30 bg-card">
                <div>
                    <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-primary" />
                                Task Context
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                {isAiEnabled && (
                                    <Button variant="outline" size="sm" className="h-8" onPointerDown={handleOpenInAstraPointerDown}>
                                        {scriptState.loading ? (
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Bot className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        {scriptState.loading ? 'Preparing...' : 'Open in Astra'}
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={handleClose}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                        <div className="p-3 rounded-lg bg-muted/50 border">
                            <p className="text-xs text-muted-foreground">Current Task</p>
                            <p className="font-bold text-base text-foreground">{task?.name || activityInfo.details || activityInfo.type}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                            {parent && (
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="flex-shrink-0">Parent</Badge>
                                    <p className="font-medium truncate">{parent.name}</p>
                                </div>
                            )}
                            {rootTask && rootTask.id !== task?.id && rootTask.id !== parent?.id && (
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="flex-shrink-0">Root</Badge>
                                    <p className="font-medium truncate">{rootTask.name}</p>
                                </div>
                            )}
                            {project && (
                                <div className="flex items-center gap-3">
                                <Badge variant="outline" className="flex-shrink-0">Project</Badge>
                                <p className="font-medium truncate">{project.name}</p>
                            </div>
                            )}
                        </div>

                        <Separator />
                        
                        <div className="space-y-2 text-sm">
                            <h4 className="font-semibold text-xs text-muted-foreground">Skill Hierarchy</h4>
                            {domain && <div className="flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Domain</Badge> <span>{domain.name}</span></div>}
                            {coreSkill && <div className="flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Core Skill</Badge> {getCoreSkillIcon(coreSkill.type)} <span>{coreSkill.name}</span></div>}
                            {skillArea && <div className="flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Skill Area</Badge> <span>{skillArea.name}</span></div>}
                            <div className="flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">{task ? 'Micro-Skill' : 'Type'}</Badge> <span className="font-bold">{task?.category || activityInfo.type}</span></div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {linkedBotherings.length > 0 && (
                                    <Badge variant="secondary">{linkedBotherings.length} linked bothering{linkedBotherings.length === 1 ? '' : 's'}</Badge>
                                )}
                                {learningPlanContext?.specializationName && (
                                    <Badge variant="secondary">Learning: {learningPlanContext.specializationName}</Badge>
                                )}
                                {projectPlanContext?.projectName && (
                                    <Badge variant="secondary"><Briefcase className="mr-1 h-3 w-3" />{projectPlanContext.projectName}</Badge>
                                )}
                            </div>

                            {linkedBotherings.length > 0 && (
                                <div className="rounded-lg border bg-muted/20 p-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked botherings</p>
                                    <div className="space-y-1.5 text-sm">
                                        {linkedBotherings.map((bothering) => (
                                            <div key={`${bothering.id}-${bothering.type}`}>
                                                <span className="font-medium text-foreground">{bothering.text}</span>
                                                <span className="ml-2 text-xs uppercase text-muted-foreground">{bothering.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {scriptState.error && (
                                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                                    {scriptState.error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="font-semibold text-xs text-muted-foreground">AI Draft BCI</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Boundary defines lifecycle, contents define what exists inside it, invariant defines what must stay true.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                bciState.usedFallback && "border-amber-500/40 text-amber-300",
                                                !bciState.usedFallback && bciState.data && "border-emerald-500/40 text-emerald-300"
                                            )}
                                        >
                                            {bciState.loading ? 'Generating' : bciState.usedFallback ? 'Fallback draft' : 'AI draft'}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7"
                                            onClick={() => void generateBci()}
                                            disabled={bciState.loading || !bciContext}
                                        >
                                            {bciState.loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
                                            Regenerate
                                        </Button>
                                    </div>
                                </div>

                                {bciState.providerLabel && (
                                    <p className="text-[11px] text-muted-foreground">Source: {bciState.providerLabel}</p>
                                )}

                                {scriptState.providerLabel && scriptState.data && (
                                    <p className="text-[11px] text-muted-foreground">Astra script source: {scriptState.providerLabel}</p>
                                )}

                                {bciState.error ? (
                                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                                        {bciState.error}
                                    </div>
                                ) : bciState.loading && !bciState.data ? (
                                    <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                                        Generating a draft from the task, linked bothering, and plan context...
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                                        {renderBciSection('Boundary', bciState.data?.boundary || [])}
                                        {renderBciSection('Contents', bciState.data?.contents || [])}
                                        {renderBciSection('Invariant', bciState.data?.invariant || [])}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </div>
    );
}
