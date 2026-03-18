
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, History, Repeat, Link as LinkIcon, CheckCircle2, Circle, Trash2, Play, Timer, PlusCircle, FileText, Bot, Loader2, Bug, CircleDollarSign } from 'lucide-react';
import type { Activity, ActivityType, RecurrenceRule } from '@/types/workout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, addMonths, differenceInDays, differenceInMonths, isAfter, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { EditableActivityText } from './EditableActivityText';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getAiConfigFromSettings } from '@/lib/ai/config';
import type { TaskBciContext, TaskBciLinkedBothering } from '@/lib/taskBci';
import { getEffectiveConstraintTasks } from '@/lib/botheringUtils';
import { buildFlashcardTaskKey, getFlashcardSessionsForTask } from '@/lib/flashcards';
import { FlashcardReviewModal } from './FlashcardReviewModal';


const activityIcons: Record<ActivityType, React.ReactNode> = {
    workout: <Dumbbell className="h-4 w-4" />,
    upskill: <BookOpenCheck className="h-4 w-4" />,
    deepwork: <Briefcase className="h-4 w-4" />,
    finance: <CircleDollarSign className="h-4 w-4" />,
    planning: <ClipboardList className="h-4 w-4" />,
    tracking: <ClipboardCheck className="h-4 w-4" />,
    branding: <Share2 className="h-4 w-4" />,
    'lead-generation': <Magnet className="h-4 w-4" />,
    essentials: <CheckSquare className="h-4 w-4" />,
    nutrition: <Utensils className="h-4 w-4" />,
    interrupt: <AlertCircle className="h-4 w-4 text-red-500" />,
    distraction: <Wind className="h-4 w-4 text-yellow-500" />,
    mindset: <Brain className="h-4 w-4" />,
    'spaced-repetition': <Repeat className="h-4 w-4 text-blue-500" />,
    pomodoro: <Timer className="h-4 w-4" />,
    bugs: <Bug className="h-4 w-4 text-rose-400" />,
};

interface AgendaWidgetItemProps {
    activity: Activity & { slot: string };
    date: Date;
    onToggleComplete: (slotName: string, activityId: string) => void;
    onRemoveActivity: (slotName: string, activityId: string) => void;
    onUpdateActivity: (activityId: string, newDetails: string) => void;
    setRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
    onActivityClick?: (activity: Activity, event: React.MouseEvent) => void;
    onStartFocus?: (activity: Activity, event: React.MouseEvent) => void;
    onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
    context: 'agenda' | 'timeslot';
    loggedDuration?: string;
    expectedDuration?: string;
    hasLoggedStopper?: boolean;
}

const sourceTypeByCardId: Record<string, TaskBciLinkedBothering['type']> = {
    mindset_botherings_external: 'external',
    mindset_botherings_mismatch: 'mismatch',
    mindset_botherings_constraint: 'constraint',
};

const normalizeText = (value: unknown) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

export const AgendaWidgetItem = React.memo(({ 
    activity,
    date, 
    onToggleComplete, 
    onRemoveActivity, 
    onUpdateActivity, 
    setRoutine, 
    onActivityClick, 
    onStartFocus,
    onOpenHabitPopup, 
    context,
    loggedDuration,
    expectedDuration,
    hasLoggedStopper,
}: AgendaWidgetItemProps) => {
    const { 
        setSelectedDeepWorkTask, 
        setSelectedUpskillTask,
        findRootTask,
        highlightedTaskIds,
        currentSlot,
        coreSkills,
        projects,
        skillDomains,
        microSkillMap,
        resources,
        openPdfViewer,
        offerizationPlans,
        skillAcquisitionPlans,
        upskillDefinitions,
        deepWorkDefinitions,
        kanbanBoards,
        mindsetCards,
        settings,
    } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isOpeningAstraScript, setIsOpeningAstraScript] = useState(false);
    const [isFlashcardReviewOpen, setIsFlashcardReviewOpen] = useState(false);

    const isInlineEditable = !['upskill', 'deepwork', 'workout', 'branding', 'lead-generation', 'mindset', 'nutrition', 'spaced-repetition'].includes(activity.type);
    const isAgendaContext = context === 'agenda';

    const handleItemClick = (e: React.MouseEvent) => {
        if (onActivityClick) {
            onActivityClick(activity, e);
        }
    };
    
    const isPlanningTask = (activity.type === 'upskill' || activity.type === 'deepwork') && activity.linkedEntityType === 'specialization';
    const linkedActivityName = activity.type === 'pomodoro' && activity.linkedActivityType
        ? activity.linkedActivityType.charAt(0).toUpperCase() + activity.linkedActivityType.slice(1).replace('-', ' ')
        : null;

    const handleBadgeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    
        if (activity.completed && activity.type === 'pomodoro' && activity.taskIds && activity.taskIds.length > 0) {
            const rootTask = findRootTask(activity);
            if (rootTask) {
                if (activity.linkedActivityType === 'deepwork') {
                    setSelectedDeepWorkTask(rootTask);
                    router.push('/deep-work');
                } else if (activity.linkedActivityType === 'upskill') {
                    setSelectedUpskillTask(rootTask);
                    router.push('/deep-work');
                }
            }
        }
    };

    const baseMatch = activity.id.match(/_(\d{4}-\d{2}-\d{2})$/);
    const baseId = baseMatch ? activity.id.slice(0, -11) : activity.id;
    const isHighlighted =
        highlightedTaskIds?.has(activity.id) ||
        highlightedTaskIds?.has(baseId) ||
        (activity.taskIds || []).some(id => highlightedTaskIds?.has(id));
    const shouldStrike = activity.completed || !!hasLoggedStopper;
    const taskInfo = useMemo(() => {
        const allDefs = [...(deepWorkDefinitions || []), ...(upskillDefinitions || [])];
        const normalizeLookup = (value?: string) => normalizeText(value).toLowerCase();
        const taskIdCandidates = [
            activity.taskIds?.[0],
            activity.id,
        ]
            .map((value) => String(value || '').trim())
            .filter(Boolean);
        const detailsKey = normalizeLookup(activity.details);
        const task = allDefs.find((definition) =>
            taskIdCandidates.some((candidate) => candidate === definition.id || candidate.startsWith(definition.id)) ||
            (!!detailsKey && normalizeLookup(definition.name) === detailsKey)
        );

        if (!task) return null;

        const parent = allDefs.find((definition) =>
            (definition.linkedDeepWorkIds?.includes(task.id)) ||
            (definition.linkedUpskillIds?.includes(task.id))
        );

        const linkedProjectId =
            parent?.primaryProjectId ||
            (parent?.linkedProjectIds && parent.linkedProjectIds.length > 0 ? parent.linkedProjectIds[0] : null);
        const linkedProject = linkedProjectId
            ? (projects || []).find((project) => project.id === linkedProjectId)
            : null;

        const microSkillId = Array.from((microSkillMap || new Map()).entries()).find(([, value]) => value.microSkillName === task.category)?.[0];
        const microSkillInfo = microSkillId ? microSkillMap.get(microSkillId) : null;

        let domain: (typeof skillDomains)[number] | undefined;
        let coreSkill: (typeof coreSkills)[number] | undefined;
        let skillArea: (typeof coreSkills)[number]["skillAreas"][number] | undefined;

        if (microSkillInfo) {
            const foundCoreSkill = (coreSkills || []).find((skill) => skill.name === microSkillInfo.coreSkillName);
            if (foundCoreSkill) {
                coreSkill = foundCoreSkill;
                domain = (skillDomains || []).find((entry) => entry.id === foundCoreSkill.domainId);
                skillArea = foundCoreSkill.skillAreas.find((area) => area.microSkills.some((micro) => micro.id === microSkillId));
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
    }, [activity.details, activity.id, activity.taskIds, coreSkills, deepWorkDefinitions, microSkillMap, projects, skillDomains, upskillDefinitions]);
    const rootTask = useMemo(() => findRootTask(activity), [activity, findRootTask]);
    const mismatchPointById = useMemo(() => {
        const mismatchCard = (mindsetCards || []).find((card) => card.id === 'mindset_botherings_mismatch');
        return new Map((mismatchCard?.points || []).map((point) => [point.id, point] as const));
    }, [mindsetCards]);
    const externalPointById = useMemo(() => {
        const externalCard = (mindsetCards || []).find((card) => card.id === 'mindset_botherings_external');
        return new Map((externalCard?.points || []).map((point) => [point.id, point] as const));
    }, [mindsetCards]);
    const linkedBotherings = useMemo(() => {
        const currentTaskId = String(taskInfo?.task.id || '');
        const currentActivityId = String(activity.id || '');
        const normalizedTaskName = normalizeText(taskInfo?.task.name || activity.details).toLowerCase();
        const normalizedActivityDetails = normalizeText(activity.details).toLowerCase();

        const matchesTaskRef = (taskRef: any) => {
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

        const matches: Array<TaskBciLinkedBothering & { id: string }> = [];
        (mindsetCards || []).forEach((card) => {
            const sourceType = sourceTypeByCardId[card.id];
            if (!sourceType) return;
            (card.points || []).forEach((point) => {
                const directTasks = Array.isArray(point.tasks) ? point.tasks : [];
                const effectiveTasks =
                    sourceType === 'constraint'
                        ? getEffectiveConstraintTasks(point, mismatchPointById, externalPointById)
                        : directTasks;
                if (!effectiveTasks.some(matchesTaskRef)) return;
                matches.push({
                    id: point.id,
                    type: sourceType,
                    text: normalizeText(point.text) || 'Untitled bothering',
                    resolution: normalizeText(point.resolution) || undefined,
                    mismatchType: point.mismatchType,
                });
            });
        });

        return matches.filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index);
    }, [activity.details, activity.id, externalPointById, mindsetCards, mismatchPointById, taskInfo]);
    const learningContext = useMemo(() => {
        if (!(activity.type === 'upskill' || activity.type === 'deepwork')) return null;
        const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const specs = (coreSkills || []).filter((skill) => skill.type === 'Specialization');
        const allDefs = [...(upskillDefinitions || []), ...(deepWorkDefinitions || [])];

        const matchedDef =
            allDefs.find((def) => def.id === activity.id) ||
            allDefs.find((def) => normalizeText(def.name) === normalizeText(activity.details));
        const microSkillName = matchedDef?.category || null;
        let matchedSpec = specs.find((spec) => spec.id === activity.id || normalizeText(spec.name) === normalizeText(activity.details));
        if (!matchedSpec) {
            if (matchedDef) {
                const categoryKey = normalizeText(matchedDef.category);
                matchedSpec = specs.find((spec) => {
                    if (normalizeText(spec.name) === categoryKey) return true;
                    if (spec.skillAreas.some((area) => normalizeText(area.name) === categoryKey)) return true;
                    return spec.skillAreas.some((area) => area.microSkills.some((micro) => normalizeText(micro.name) === categoryKey));
                });
            }
        }

        if (!matchedSpec) return null;
        const matchedAreaId =
            microSkillName
                ? matchedSpec.skillAreas.find((area) =>
                    area.microSkills.some((micro) => normalizeText(micro.name) === normalizeText(microSkillName))
                  )?.id || null
                : null;

        return { spec: matchedSpec, microSkillName, matchedAreaId };
    }, [activity.details, activity.id, activity.type, coreSkills, deepWorkDefinitions, upskillDefinitions]);
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
            (coreSkills || []).find(
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
    const learningTargetLabel = useMemo(() => {
        if (!(activity.type === 'upskill' || activity.type === 'deepwork')) return null;
        const matchedSpec = learningContext?.spec;
        if (!matchedSpec) return null;

        const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const stripInstanceDateSuffix = (id?: string | null) => (id || '').replace(/_(\d{4}-\d{2}-\d{2})$/, '');
        const normalizeDateKey = (value?: string | null) => {
            if (!value) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return null;
            return parsed.toISOString().slice(0, 10);
        };
        const today = startOfDay(new Date());
        const activityBaseId = stripInstanceDateSuffix(activity.id);
        const matchedRoutine = (settings.routines || []).find((routine) => {
            const routineBaseId = stripInstanceDateSuffix(routine.id);
            return (
                routineBaseId === activityBaseId ||
                (!!routine.details &&
                    !!activity.details &&
                    normalizeText(routine.details) === normalizeText(activity.details) &&
                    routine.type === activity.type)
            );
        });
        const routineRule = activity.routine || matchedRoutine?.routine || null;
        const recurrence = routineRule?.type || 'none';
        const repeatInterval = Math.max(1, routineRule?.repeatInterval || routineRule?.days || 1);
        const repeatUnit = routineRule?.repeatUnit || (recurrence === 'weekly' ? 'week' : 'day');
        const startDateKey = normalizeDateKey(activity.baseDate || matchedRoutine?.baseDate || null);

        const countRemainingScheduledSessions = (endDateKey: string | null) => {
            if (!endDateKey) return null;
            const endDate = startOfDay(parseISO(endDateKey));
            if (Number.isNaN(endDate.getTime())) return null;
            if (isBefore(endDate, today)) return 0;

            if (recurrence === 'none') {
                if (!startDateKey) return null;
                const oneTimeDate = startOfDay(parseISO(startDateKey));
                if (Number.isNaN(oneTimeDate.getTime())) return null;
                return !isBefore(oneTimeDate, today) && !isAfter(oneTimeDate, endDate) ? 1 : 0;
            }

            if (!startDateKey) return null;
            let cursor = startOfDay(parseISO(startDateKey));
            if (Number.isNaN(cursor.getTime())) return null;

            if (repeatUnit === 'month') {
                if (isBefore(cursor, today)) {
                    const diffMonths = Math.max(0, differenceInMonths(today, cursor));
                    const jumpCount = Math.floor(diffMonths / repeatInterval);
                    cursor = addMonths(cursor, jumpCount * repeatInterval);
                    while (isBefore(cursor, today)) cursor = addMonths(cursor, repeatInterval);
                }
                let count = 0;
                while (!isAfter(cursor, endDate)) {
                    if (!isBefore(cursor, today)) count += 1;
                    cursor = addMonths(cursor, repeatInterval);
                }
                return count;
            }

            const stepDays = repeatUnit === 'week' ? repeatInterval * 7 : repeatInterval;
            if (isBefore(cursor, today)) {
                const diffDays = Math.max(0, differenceInDays(today, cursor));
                const jumpCount = Math.ceil(diffDays / stepDays);
                cursor = addDays(cursor, jumpCount * stepDays);
            }
            let count = 0;
            while (!isAfter(cursor, endDate)) {
                if (!isBefore(cursor, today)) count += 1;
                cursor = addDays(cursor, stepDays);
            }
            return count;
        };

        if (activity.type === 'deepwork') {
            const releases = offerizationPlans?.[matchedSpec.id]?.releases || [];
            const normalizeStageItem = (item: string | { text: string; completed?: boolean }) =>
                typeof item === 'string'
                    ? { text: item, completed: false }
                    : { text: item.text || '', completed: !!item.completed };

            const candidatePlans = releases
                .map((release) => {
                    const stages = release.workflowStages;
                    const allItems = [
                        ...(stages?.ideaItems || []),
                        ...(stages?.codeItems || []),
                        ...(stages?.breakItems || []),
                        ...(stages?.fixItems || []),
                    ].map(normalizeStageItem);
                    const remainingItems = allItems.filter((item) => item.text.trim() && !item.completed).length;
                    const launchDateKey = normalizeDateKey(release.launchDate);
                    const daysLeft = launchDateKey ? Math.max(0, differenceInDays(parseISO(launchDateKey), today)) : null;
                    const sessionsLeft = countRemainingScheduledSessions(launchDateKey);
                    return { remainingItems, daysLeft, sessionsLeft };
                })
                .filter((plan) => plan.remainingItems > 0);

            if (candidatePlans.length === 0) return null;
            const withDate = candidatePlans
                .filter((plan) => plan.daysLeft != null)
                .sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number));
            const chosen = withDate[0] || candidatePlans[0];
            const itemTarget =
                chosen.sessionsLeft != null
                    ? (chosen.sessionsLeft > 0
                        ? Math.max(1, Math.ceil(chosen.remainingItems / chosen.sessionsLeft))
                        : chosen.remainingItems)
                    : (chosen.daysLeft != null
                        ? (chosen.daysLeft === 0
                            ? chosen.remainingItems
                            : Math.max(1, Math.ceil(chosen.remainingItems / Math.max(1, chosen.daysLeft))))
                        : null);
            return itemTarget != null ? `${itemTarget} items/day` : null;
        }

        const learningPlan = offerizationPlans?.[matchedSpec.id]?.learningPlan;
        const audioResources = learningPlan?.audioVideoResources || [];
        const bookResources = learningPlan?.bookWebpageResources || [];
        const hasAudio = audioResources.length > 0;
        const hasBooks = bookResources.length > 0;
        if (!hasAudio && !hasBooks) return null;

        const totalHours = audioResources.reduce((sum, resource) => sum + (resource.totalHours || 0), 0);
        const totalPages = bookResources.reduce((sum, resource) => sum + (resource.totalPages || 0), 0);
        const completedHours = matchedSpec.skillAreas.reduce((sum, area) => sum + area.microSkills.reduce((inner, micro) => inner + (micro.completedHours || 0), 0), 0);
        const completedPages = matchedSpec.skillAreas.reduce((sum, area) => sum + area.microSkills.reduce((inner, micro) => inner + (micro.completedPages || 0), 0), 0);
        const remainingHours = Math.max(0, totalHours - completedHours);
        const remainingPages = Math.max(0, totalPages - completedPages);
        const latestAudioEndDate = audioResources
            .map((resource) => normalizeDateKey(resource.completionDate))
            .filter((date): date is string => !!date)
            .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);
        const latestBookEndDate = bookResources
            .map((resource) => normalizeDateKey(resource.completionDate))
            .filter((date): date is string => !!date)
            .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);
        const audioDaysLeft = latestAudioEndDate ? Math.max(0, differenceInDays(parseISO(latestAudioEndDate), today)) : null;
        const bookDaysLeft = latestBookEndDate ? Math.max(0, differenceInDays(parseISO(latestBookEndDate), today)) : null;
        const audioSessionsLeft = countRemainingScheduledSessions(latestAudioEndDate);
        const bookSessionsLeft = countRemainingScheduledSessions(latestBookEndDate);

        const hourTarget =
            hasAudio && remainingHours > 0
                ? (audioSessionsLeft != null
                    ? (audioSessionsLeft > 0
                        ? Math.max(0.1, Number((remainingHours / audioSessionsLeft).toFixed(1)))
                        : remainingHours)
                    : (audioDaysLeft != null
                        ? Math.max(0.1, Number((remainingHours / Math.max(1, audioDaysLeft || 1)).toFixed(1)))
                        : null))
                : null;
        const pageTarget =
            hasBooks && remainingPages > 0
                ? (bookSessionsLeft != null
                    ? (bookSessionsLeft > 0
                        ? Math.max(1, Math.ceil(remainingPages / bookSessionsLeft))
                        : remainingPages)
                    : (bookDaysLeft != null
                        ? Math.max(1, Math.ceil(remainingPages / Math.max(1, bookDaysLeft || 1)))
                        : null))
                : null;

        const pieces: string[] = [];
        if (pageTarget != null) pieces.push(`${pageTarget}p/day`);
        if (hourTarget != null) pieces.push(`${hourTarget}h/day`);
        if (pieces.length === 0) return null;
        return pieces.join(' / ');
    }, [activity.baseDate, activity.details, activity.id, activity.routine, activity.type, learningContext, offerizationPlans, settings.routines]);
    const linkedLearningPdfResource = useMemo(() => {
        if (!learningContext?.spec) return null;
        const learningPlan = offerizationPlans?.[learningContext.spec.id]?.learningPlan;
        if (!learningPlan) return null;
        const matchedAreaId = learningContext.matchedAreaId;
        const pathLinkedPdfIds = (learningPlan.skillTreePaths || [])
            .filter((path) => {
                if (!path.linkedPdfResourceId) return false;
                if (!matchedAreaId) return true;
                const areaIds = path.skillAreaIds || [];
                if (areaIds.length === 0) return true;
                return areaIds.includes(matchedAreaId);
            })
            .map((path) => path.linkedPdfResourceId as string);
        const bookLinkedPdfIds = (learningPlan.bookWebpageResources || [])
            .map((book) => book.linkedPdfResourceId)
            .filter(Boolean) as string[];
        const linkedPdfIds = [
            ...pathLinkedPdfIds,
            ...bookLinkedPdfIds,
        ];
        if (linkedPdfIds.length === 0) return null;
        const pdfResources = (resources || []).filter((resource) => resource.type === 'pdf');
        return pdfResources.find((resource) => linkedPdfIds.includes(resource.id)) || null;
    }, [learningContext, offerizationPlans, resources]);
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
            .map((resourceId) => (resources || []).find((resource) => resource.id === resourceId)?.name || '')
            .map((name) => normalizeText(name))
            .filter(Boolean);
    }, [resources, taskInfo]);
    const flashcardReviewTaskKey = useMemo(() => {
        if (activity.type !== 'spaced-repetition') return null;
        const reviewActivityType =
            activity.linkedActivityType === 'deepwork' || activity.linkedActivityType === 'upskill'
                ? activity.linkedActivityType
                : null;
        return buildFlashcardTaskKey(reviewActivityType, activity.taskIds?.[0] || taskInfo?.task.id || null);
    }, [activity.linkedActivityType, activity.taskIds, activity.type, taskInfo?.task.id]);
    const flashcardReviewSessionCount = useMemo(
        () => getFlashcardSessionsForTask(settings, flashcardReviewTaskKey).length,
        [flashcardReviewTaskKey, settings]
    );
    const pdfLaunchActivityType =
        activity.type === 'spaced-repetition'
            ? (activity.linkedActivityType === 'deepwork' || activity.linkedActivityType === 'upskill'
                ? activity.linkedActivityType
                : null)
            : (activity.type === 'deepwork' || activity.type === 'upskill'
                ? activity.type
                : null);
    const bciContext = useMemo<TaskBciContext | null>(() => {
        return {
            taskName: taskInfo?.task.name || activity.details || activity.type,
            taskType: activity.type,
            taskDetails: activity.details || taskInfo?.task.name || activity.type,
            taskDescription: taskInfo?.task.description,
            taskCategory: taskInfo?.task.category || activity.type,
            slotName: activity.slot,
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
    }, [activity.details, activity.slot, activity.type, learningPlanContext, linkedBotherings, linkedResourceNames, projectPlanContext, rootTask, taskInfo]);

    const canOpenTaskContext = Boolean(activity.id);

    const slotOrder = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];
    const isPastSlot =
        isToday(date) &&
        currentSlot &&
        slotOrder.indexOf(activity.slot) !== -1 &&
        slotOrder.indexOf(currentSlot) !== -1 &&
        slotOrder.indexOf(activity.slot) < slotOrder.indexOf(currentSlot) &&
        !activity.completed;

    const handleAddUrgePrompt = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof window === 'undefined') return;
        const baseMatch = activity.id.match(/_(\d{4}-\d{2}-\d{2})$/);
        const baseId = baseMatch ? activity.id.slice(0, -11) : undefined;
        window.dispatchEvent(new CustomEvent('open-resistance-list-for-task', {
            detail: {
                taskId: activity.id,
                taskIds: activity.taskIds || [],
                baseId,
            },
        }));
    };
    const handleOpenAstraScript = async (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        if (isOpeningAstraScript) return;

        setIsOpeningAstraScript(true);
        try {
            const isDesktopRuntime =
                typeof window !== 'undefined' &&
                (Boolean((window as any)?.studioDesktop?.isDesktop) || navigator.userAgent.toLowerCase().includes(' electron/'));
            const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);

            const bciResponse = await fetch('/api/ai/task-bci', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
                },
                body: JSON.stringify({
                    context: bciContext,
                    aiConfig,
                }),
            });
            const bciResult = await bciResponse.json().catch(() => ({}));
            if (!bciResponse.ok) {
                throw new Error(String(bciResult?.error || bciResult?.details || 'Failed to generate task context.'));
            }

            const scriptResponse = await fetch('/api/ai/task-convincer-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
                },
                body: JSON.stringify({
                    context: bciContext,
                    bci: bciResult?.bci || null,
                    aiConfig,
                }),
            });
            const scriptResult = await scriptResponse.json().catch(() => ({}));
            if (!scriptResponse.ok) {
                throw new Error(String(scriptResult?.error || scriptResult?.details || 'Failed to generate Astra script.'));
            }

            const content = String(scriptResult?.script || '').trim();
            if (!content) {
                throw new Error('Astra script came back empty.');
            }

            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('open-astra-task-script', {
                        detail: {
                            taskName: taskInfo?.task.name || activity.details || activity.type,
                            content,
                        },
                    })
                );
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to open the task script in Astra.';
            toast({
                title: 'Could not open in Astra',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsOpeningAstraScript(false);
        }
    };

    const hasLinkedKanbanCard = useMemo(() => {
        if (activity.type !== 'deepwork' || activity.completed) return false;
        const candidateIds = new Set(activity.taskIds || []);
        if (candidateIds.size === 0) return false;
        return (kanbanBoards || []).some((board) =>
            (board.cards || []).some((card) => !card.archived && candidateIds.has(card.id))
        );
    }, [activity.completed, activity.taskIds, activity.type, kanbanBoards]);

    return (
        <>
        <li 
            className={cn(
                "flex items-start gap-2 p-2 rounded-lg border border-transparent group transition-all",
                context === 'timeslot' && 'bg-background',
                onActivityClick && 'cursor-pointer',
                isHighlighted && "border-emerald-400/50 bg-emerald-500/10"
            )}
            onClick={handleItemClick}
        >
            <div className="mt-0.5 flex flex-col items-center gap-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasLinkedKanbanCard && onStartFocus) {
                            onStartFocus(activity, e);
                            return;
                        }
                        onToggleComplete(activity.slot, activity.id);
                    }}
                >
                {activity.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                </button>
                {isPastSlot && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleAddUrgePrompt}
                        title="Add urge or resistance"
                    >
                        <PlusCircle className="h-3.5 w-3.5 text-amber-400" />
                    </Button>
                )}
            </div>
            <div className="flex-grow min-w-0">
                {(isAgendaContext || context === 'timeslot') && isInlineEditable ? (
                    <EditableActivityText
                        initialValue={activity.details}
                        onUpdate={(newDetails) => onUpdateActivity(activity.id, newDetails)}
                        className={cn("text-sm font-medium w-full block", shouldStrike && "line-through text-muted-foreground")}
                    />
                ) : (
                    <p className={cn("text-sm font-medium", shouldStrike && "line-through text-muted-foreground")}>
                        {activity.details}
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                        {activityIcons[activity.type]} {activity.type.replace('-', ' ')}
                    </div>
                    {linkedActivityName && (
                        <Badge 
                            variant={activity.completed ? 'outline' : 'secondary'}
                            onClick={handleBadgeClick}
                            className={cn(activity.completed && "cursor-pointer hover:bg-accent")}
                        >
                            {linkedActivityName}
                        </Badge>
                    )}
                    {isPlanningTask && <Badge variant="outline">Planning</Badge>}
                    {!activity.completed && expectedDuration && (
                        <Badge className="theme-pill-warning border">
                            {expectedDuration}
                        </Badge>
                    )}
                    {!activity.completed && learningTargetLabel && (
                        <Badge className="theme-pill-info border">
                            {learningTargetLabel}
                        </Badge>
                    )}
                    {activity.completed && loggedDuration && (
                        <Badge variant="secondary">{loggedDuration}</Badge>
                    )}
                </div>
                {(!activity.completed && linkedLearningPdfResource) || canOpenTaskContext || flashcardReviewSessionCount > 0 ? (
                    <div className="mt-1 flex justify-end gap-1">
                        {canOpenTaskContext && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={handleOpenAstraScript}
                                disabled={isOpeningAstraScript}
                                title="Open task script in Astra"
                            >
                                {isOpeningAstraScript ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                            </Button>
                        )}
                        {!activity.completed && linkedLearningPdfResource && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                                e.stopPropagation();
                                openPdfViewer(linkedLearningPdfResource, {
                                    sourceActivityId: activity.id,
                                    sourceDefinitionId: taskInfo?.task.id || activity.taskIds?.[0] || null,
                                    sourceTaskActivityType: pdfLaunchActivityType,
                                });
                            }}
                            title={`Open linked PDF: ${linkedLearningPdfResource.name}`}
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </Button>
                        )}
                        {flashcardReviewSessionCount > 0 && flashcardReviewTaskKey && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsFlashcardReviewOpen(true);
                                }}
                                title={`Review ${flashcardReviewSessionCount} linked flashcard session${flashcardReviewSessionCount === 1 ? '' : 's'}`}
                            >
                                <BookOpenCheck className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                ) : null}
            </div>
        </li>
        <FlashcardReviewModal
            open={isFlashcardReviewOpen}
            onOpenChange={setIsFlashcardReviewOpen}
            taskKey={flashcardReviewTaskKey}
            title={activity.details}
        />
        </>
    );
});
AgendaWidgetItem.displayName = 'AgendaWidgetItem';
