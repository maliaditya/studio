"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isBefore, isSameDay, parseISO, startOfToday } from 'date-fns';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { buildDefaultPointsForResourceType } from '@/lib/resourceDefaults';
import {
  BookOpenCheck,
  Briefcase,
  Calendar,
  CalendarPlus,
  CheckSquare,
  Copy,
  Clock3,
  Eye,
  Pencil,
  FileText,
  Magnet,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Video,
  X,
  Library,
} from 'lucide-react';
import type { Activity, ExerciseDefinition, KanbanBoard, KanbanCard, KanbanLabel, KanbanList, ProductizationPlan, Release, Resource, ResourceFolder, SlotName } from '@/types/workout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface KanbanPageContentProps {
  isModal?: boolean;
  forcedBoardMode?: BoardMode;
  initialBoardId?: string;
  initialCardId?: string;
  onSelectCard?: (card: KanbanCard) => void;
}

type TaskBoardBuckets = {
  pending: any[];
  scheduled: any[];
  logged: any[];
  completed: any[];
};

type BoardMode = 'project' | 'branding' | 'tasks';

type ReleaseOption = {
  key: string;
  specializationId: string;
  specializationName: string;
  release: Release;
};

type CardDraft = {
  listId: string;
  title: string;
  description: string;
  dueDate: string;
  labelIds: string[];
  linkedFeaturePointId: string;
  linkedFeaturePointIds: string[];
  brandingType: 'blog' | 'video';
  linkedIntentionIds: string[];
  checklist: KanbanCard['checklist'];
};

type PendingIntentionDraft = {
  tempId: string;
  name: string;
  microSkillIds: string[];
  microSkillNames: string[];
};

type EditableIntentionOption = {
  id: string;
  name: string;
  description: string;
  microSkillNames: string[];
  kind: 'pending' | 'existing';
};

type DraggedCardState = {
  cardId: string;
  fromListId: string;
};

type CardDropTarget = {
  listId: string;
  beforeCardId: string | null;
};

const LABEL_COLOR_PALETTE = [
  '#22c55e',
  '#14b8a6',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#64748b',
];

const DEFAULT_KANBAN_LABELS = [
  { title: 'Todo', color: '#2563eb' },
  { title: 'In Progress', color: '#f97316' },
  { title: 'Done', color: '#0f766e' },
  { title: 'Severity: Low', color: '#22c55e' },
  { title: 'Severity: Medium', color: '#eab308' },
  { title: 'Severity: High', color: '#f97316' },
  { title: 'Severity: Critical', color: '#dc2626' },
  { title: 'Priority: Low', color: '#38bdf8' },
  { title: 'Priority: Medium', color: '#6366f1' },
  { title: 'Priority: High', color: '#f97316' },
  { title: 'Priority: Blocker', color: '#b91c1c' },
] as const;

const BRANDING_LIST_TEMPLATES = [
  { key: 'script', title: 'Creating Script', color: '#2563eb' },
  { key: 'final', title: 'Finalizing Script', color: '#7c3aed' },
  { key: 'audio', title: 'Audio Recording', color: '#0891b2' },
  { key: 'video', title: 'Video Recording', color: '#db2777' },
  { key: 'social', title: 'Post on Social Media', color: '#ea580c' },
  { key: 'done', title: 'Done', color: '#0f766e' },
] as const;

const getTaskCategory = (type: string) => {
  switch (type) {
    case 'workout':
      return 'Health';
    case 'upskill':
      return 'Growth';
    case 'deepwork':
      return 'Wealth';
    case 'branding':
      return 'Branding';
    case 'lead-generation':
      return 'Lead Gen';
    case 'planning':
      return 'Planning';
    case 'tracking':
      return 'Tracking';
    default:
      return 'Task';
  }
};

const getCategoryColor = (type: string) => {
  switch (type) {
    case 'workout':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    case 'upskill':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case 'deepwork':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    case 'branding':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
    case 'lead-generation':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
  }
};

const TaskColumn = ({
  title,
  tasks,
  isModal,
  onDelete,
}: {
  title: string;
  tasks: any[];
  isModal?: boolean;
  onDelete: (slot: string, id: string) => void;
}) => (
  <div className={cn('flex flex-col flex-shrink-0 bg-muted/50 rounded-xl', isModal ? 'w-64' : 'w-80')}>
    <h2 className="font-semibold px-3 pt-3 text-foreground">
      {title} <Badge variant="secondary" className="ml-1">{tasks.length}</Badge>
    </h2>
    <ScrollArea className="h-full mt-2">
      <div className="p-3 space-y-3">
        {tasks.length > 0 ? tasks.map((task) => (
          <Card key={task.id} className="p-3 rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-muted rounded-md mt-0.5">
                {task.type === 'upskill' ? (
                  <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
                ) : task.type === 'lead-generation' ? (
                  <Magnet className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-medium text-sm leading-tight text-foreground">{task.details}</p>
                <Badge className={cn('mt-1.5 text-xs', getCategoryColor(task.type))}>
                  {getTaskCategory(task.type)}
                </Badge>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the task "{task.details}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(task.slot, task.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="mt-3 pt-2 border-t flex items-center justify-end text-xs text-orange-500 font-semibold">
              <Calendar className="h-3 w-3 mr-1" />
              {format(parseISO(task.date), 'MMM d')}
            </div>
          </Card>
        )) : (
          <div className="flex items-center justify-center border-2 border-dashed rounded-md h-24">
            <p className="text-sm text-muted-foreground">No tasks</p>
          </div>
        )}
      </div>
    </ScrollArea>
  </div>
);

const cardChecklistDone = (card: KanbanCard) => card.checklist.filter((item) => item.completed).length;

const normalizeKanbanTitle = (value?: string | null) => value?.trim().toLowerCase() || '';

const formatDueDate = (dueDate?: string | null) => {
  if (!dueDate) return null;
  try {
    return format(parseISO(dueDate), 'MMM d');
  } catch {
    return dueDate;
  }
};

const getDescriptionPreview = (description?: string | null, maxLength = 50) => {
  const text = description?.trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const mergeDefaultKanbanLabels = (boardId: string, labels: KanbanLabel[]) => {
  const normalized = new Set(labels.map((label) => label.title.trim().toLowerCase()));
  const defaultsToAdd = DEFAULT_KANBAN_LABELS
    .filter((label) => !normalized.has(label.title.toLowerCase()))
    .map((label) => ({
      id: `${boardId}-label-default-${label.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      boardId,
      title: label.title,
      color: label.color,
    }));
  return [...labels, ...defaultsToAdd];
};

const formatLoggedMinutes = (minutes?: number) => {
  const total = Math.max(0, minutes || 0);
  if (total <= 0) return null;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

const getOrderedBoardLists = (board: KanbanBoard) => {
  const listMap = new Map(board.lists.map((list) => [list.id, list]));
  const orderedFromListOrder = board.listOrder
    .map((listId) => listMap.get(listId))
    .filter((list): list is KanbanList => !!list);
  const remaining = board.lists
    .filter((list) => !orderedFromListOrder.some((entry) => entry.id === list.id))
    .sort((a, b) => a.position - b.position);
  return [...orderedFromListOrder, ...remaining];
};

const getReviewList = (board: KanbanBoard) => {
  const orderedLists = getOrderedBoardLists(board);
  return orderedLists[2] || null;
};

const getDoneList = (board: KanbanBoard) => {
  const orderedLists = getOrderedBoardLists(board);
  return orderedLists[orderedLists.length - 1] || null;
};

const hasOpenBugForParent = (board: KanbanBoard, parentCardId: string) =>
  board.cards.some((card) => card.cardKind === 'bug' && !card.archived && card.parentCardId === parentCardId);

const getListByTitle = (board: KanbanBoard, title: string) =>
  getOrderedBoardLists(board).find((list) => normalizeKanbanTitle(list.title) === normalizeKanbanTitle(title)) || null;

const getStatusLabelTitleForList = (listTitle?: string | null) => {
  const normalized = normalizeKanbanTitle(listTitle);
  if (normalized === 'idea') return 'Todo';
  if (normalized === 'done') return 'Done';
  return 'In Progress';
};

const synchronizeBoardAutomation = (board: KanbanBoard, timestamp: string) => {
  const labels = mergeDefaultKanbanLabels(board.id, board.labels);
  const labelById = new Map(labels.map((label) => [label.id, label]));
  const statusLabels = new Map(labels.map((label) => [normalizeKanbanTitle(label.title), label]));
  const statusLabelTitles = new Set(['todo', 'in progress', 'done']);
  const orderedLists = getOrderedBoardLists(board);
  const codeList = getListByTitle(board, 'Code');
  const breakList = getListByTitle(board, 'Break');
  const doneList = getDoneList(board);
  const previousListByCardId = new Map(board.cards.map((card) => [card.id, card.listId]));
  const previousOrderByListCard = new Map<string, number>();

  board.lists.forEach((list) => {
    list.cardOrder.forEach((cardId, index) => {
      previousOrderByListCard.set(`${list.id}:${cardId}`, index);
    });
  });

  const openBugParentIds = new Set(
    board.cards
      .filter((card) => card.cardKind === 'bug' && !card.archived && card.parentCardId)
      .map((card) => card.parentCardId as string)
  );

  const nextCards = board.cards.map((card) => {
    if (card.archived || card.cardKind === 'bug') {
      return card;
    }

    const checklistComplete = card.checklist.length > 0 && card.checklist.every((item) => item.completed);
    let nextListId = card.listId;

    if (openBugParentIds.has(card.id) && breakList) {
      nextListId = breakList.id;
    } else if (checklistComplete && doneList) {
      nextListId = doneList.id;
    } else if ((card.listId === breakList?.id || card.listId === doneList?.id) && codeList) {
      nextListId = codeList.id;
    }

    const targetList = orderedLists.find((list) => list.id === nextListId) || null;
    const targetStatusTitle = normalizeKanbanTitle(getStatusLabelTitleForList(targetList?.title));
    const targetStatusLabel = statusLabels.get(targetStatusTitle) || null;
    const nonStatusLabelIds = card.labelIds.filter((labelId) => {
      const label = labelById.get(labelId);
      return !label || !statusLabelTitles.has(normalizeKanbanTitle(label.title));
    });
    const nextLabelIds =
      targetStatusLabel && !nonStatusLabelIds.includes(targetStatusLabel.id)
        ? [...nonStatusLabelIds, targetStatusLabel.id]
        : nonStatusLabelIds;

    return {
      ...card,
      listId: nextListId,
      labelIds: nextLabelIds,
      updatedAt: nextListId !== card.listId || nextLabelIds.length !== card.labelIds.length || nextLabelIds.some((id, index) => id !== card.labelIds[index])
        ? timestamp
        : card.updatedAt,
    };
  });

  const nextLists = board.lists.map((list) => {
    const cardsInList = nextCards
      .filter((card) => !card.archived && card.listId === list.id)
      .sort((a, b) => {
        const aWasHere = previousListByCardId.get(a.id) === list.id;
        const bWasHere = previousListByCardId.get(b.id) === list.id;
        if (aWasHere !== bWasHere) return aWasHere ? -1 : 1;
        if (aWasHere && bWasHere) {
          const aIndex = previousOrderByListCard.get(`${list.id}:${a.id}`) ?? Number.MAX_SAFE_INTEGER;
          const bIndex = previousOrderByListCard.get(`${list.id}:${b.id}`) ?? Number.MAX_SAFE_INTEGER;
          if (aIndex !== bIndex) return aIndex - bIndex;
        }
        return (a.position ?? 0) - (b.position ?? 0) || a.createdAt.localeCompare(b.createdAt);
      });

    return {
      ...list,
      cardOrder: cardsInList.map((card) => card.id),
    };
  });

  const positionedCards = nextCards.map((card) => {
    const list = nextLists.find((entry) => entry.id === card.listId);
    const position = list ? list.cardOrder.indexOf(card.id) : card.position;
    return position !== card.position ? { ...card, position } : card;
  });

  return {
    ...board,
    labels,
    cards: positionedCards,
    lists: nextLists,
    updatedAt: timestamp,
  };
};

const moveCardWithinBoard = (
  board: KanbanBoard,
  cardId: string,
  targetListId: string,
  beforeCardId: string | null,
  timestamp: string
) => {
  const card = board.cards.find((entry) => entry.id === cardId);
  if (!card) return board;

  const sourceList = board.lists.find((list) => list.id === card.listId);
  const targetList = board.lists.find((list) => list.id === targetListId);
  if (!sourceList || !targetList) return board;

  const sourceOrderWithoutCard = sourceList.cardOrder.filter((id) => id !== card.id);
  const targetBaseOrder =
    sourceList.id === targetList.id
      ? sourceOrderWithoutCard
      : targetList.cardOrder.filter((id) => id !== card.id);

  const insertIndex =
    beforeCardId && targetBaseOrder.includes(beforeCardId)
      ? targetBaseOrder.indexOf(beforeCardId)
      : targetBaseOrder.length;

  const targetOrder = [
    ...targetBaseOrder.slice(0, insertIndex),
    card.id,
    ...targetBaseOrder.slice(insertIndex),
  ];

  const nextLists = board.lists.map((list) => {
    if (list.id === sourceList.id && list.id === targetList.id) {
      return { ...list, cardOrder: targetOrder };
    }
    if (list.id === sourceList.id) {
      return { ...list, cardOrder: sourceOrderWithoutCard };
    }
    if (list.id === targetList.id) {
      return { ...list, cardOrder: targetOrder };
    }
    return list;
  });

  const nextCards = board.cards.map((entry) =>
    entry.id === card.id
      ? {
          ...entry,
          listId: targetListId,
          position: targetOrder.indexOf(entry.id),
          updatedAt: timestamp,
        }
      : entry
  );

  return {
    ...board,
    cards: nextCards,
    lists: nextLists,
    updatedAt: timestamp,
  };
};

const resolveBugCard = (board: KanbanBoard, bugCardId: string, timestamp: string) => {
  const bugCard = board.cards.find((card) => card.id === bugCardId);
  if (!bugCard || bugCard.cardKind !== 'bug') return board;

  let nextCards = board.cards.map((card) =>
    card.id === bugCardId
      ? {
          ...card,
          archived: true,
          resolvedAt: timestamp,
          updatedAt: timestamp,
        }
      : card
  );

  if (bugCard.parentCardId && bugCard.linkedBugIntentionId) {
    const hasRemainingOpenBug = nextCards.some(
      (card) =>
        card.id !== bugCardId &&
        card.cardKind === 'bug' &&
        !card.archived &&
        card.parentCardId === bugCard.parentCardId &&
        card.linkedBugIntentionId === bugCard.linkedBugIntentionId
    );

    nextCards = nextCards.map((card) => {
      if (card.id !== bugCard.parentCardId) return card;
      return {
        ...card,
        checklist: card.checklist.map((item) =>
          item.linkedIntentionId === bugCard.linkedBugIntentionId
            ? {
                ...item,
                completed: !hasRemainingOpenBug,
              }
            : item
        ),
        updatedAt: timestamp,
      };
    });
  }

  let nextBoard: KanbanBoard = {
    ...board,
    cards: nextCards,
    lists: board.lists.map((list) => ({
      ...list,
      cardOrder: list.cardOrder.filter((cardId) => cardId !== bugCardId),
    })),
    updatedAt: timestamp,
  };

  if (bugCard.parentCardId) {
    const parentCard = nextBoard.cards.find((card) => card.id === bugCard.parentCardId);
    const doneList = getDoneList(nextBoard);
    if (
      parentCard &&
      doneList &&
      parentCard.cardKind !== 'bug' &&
      parentCard.listId !== doneList.id &&
      parentCard.checklist.length > 0 &&
      parentCard.checklist.every((item) => item.completed) &&
      !hasOpenBugForParent(nextBoard, parentCard.id)
    ) {
      nextBoard = moveCardWithinBoard(nextBoard, parentCard.id, doneList.id, null, timestamp);
    }
  }

  return synchronizeBoardAutomation(nextBoard, timestamp);
};

const getBoardReleaseOptions = (
  offerizationPlans: Record<string, ProductizationPlan>,
  specializationNames: Map<string, string>
): ReleaseOption[] => {
  const options: ReleaseOption[] = [];
  Object.entries(offerizationPlans || {}).forEach(([specializationId, plan]) => {
    (plan?.releases || []).forEach((release) => {
      options.push({
        key: `${specializationId}::${release.id}`,
        specializationId,
        specializationName: specializationNames.get(specializationId) || 'Specialization',
        release,
      });
    });
  });
  return options;
};

const normalizeBoardLookupText = (value?: string | null) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getProjectBoardScore = (
  board: KanbanBoard,
  projects: Array<{ id: string; name: string }>,
  releaseOption?: ReleaseOption | null
) => {
  const linkedProject = board.projectId ? projects.find((project) => project.id === board.projectId) || null : null;
  const boardName = normalizeBoardLookupText(board.name);
  const releaseName = normalizeBoardLookupText(releaseOption?.release.name);
  let score = 0;

  if (linkedProject) score += 60;
  if (linkedProject && releaseName && normalizeBoardLookupText(linkedProject.name) === releaseName) score += 100;
  if (releaseName && boardName === releaseName) score += 80;
  if ((board.cards || []).some((card) => !card.archived)) score += 20;

  const updatedAtScore = Date.parse(board.updatedAt || '') || 0;
  return { score, updatedAtScore };
};

const BoardCard = ({
  card,
  labels,
  linkedFeatureNames,
  onOpen,
  onDragStart,
  onDragEnd,
  isDragging,
  checklistExpanded,
  onToggleChecklist,
  onToggleChecklistItem,
  onScheduleBug,
  onOpenResource,
}: {
  card: KanbanCard;
  labels: KanbanLabel[];
  linkedFeatureNames?: string[];
  onOpen: (card: KanbanCard) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, card: KanbanCard) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  checklistExpanded: boolean;
  onToggleChecklist: (cardId: string) => void;
  onToggleChecklistItem: (cardId: string, itemId: string) => void;
  onScheduleBug: (card: KanbanCard) => void;
  onOpenResource: (card: KanbanCard) => void;
}) => {
  const checklistDone = cardChecklistDone(card);
  const descriptionPreview = getDescriptionPreview(card.description);
  const loggedTimeLabel = formatLoggedMinutes(card.totalLoggedMinutes);
  const labelBars = card.labelIds
    .map((labelId) => labels.find((label) => label.id === labelId))
    .filter((label): label is KanbanLabel => !!label);

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, card)}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(card);
        }
      }}
      className={cn(
        'w-full rounded-xl border border-border/60 bg-background/45 p-3 text-left transition hover:border-border hover:bg-background/60',
        isDragging && 'opacity-45'
      )}
    >
      {labelBars.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {labelBars.map((label) => (
            <span
              key={label.id}
              className="inline-flex max-w-full items-center rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: label.color }}
              title={label.title}
            >
              <span className="truncate">{label.title}</span>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{card.title}</div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenResource(card);
          }}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground transition hover:border-border hover:bg-background/60 hover:text-foreground"
          title="Open resource card"
        >
          <Library className="h-3.5 w-3.5" />
        </button>
      </div>
      {card.brandingType ? (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-1 text-[11px] text-muted-foreground">
            {card.brandingType === 'video' ? <Video className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {card.brandingType === 'video' ? 'Video' : 'Blog'}
          </span>
        </div>
      ) : null}
      {linkedFeatureNames && linkedFeatureNames.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {linkedFeatureNames.slice(0, 2).map((linkedFeatureName) => (
            <span key={linkedFeatureName} className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-200">
              <Library className="h-3 w-3 shrink-0" />
              <span className="truncate">{linkedFeatureName}</span>
            </span>
          ))}
          {linkedFeatureNames.length > 2 ? (
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/40 px-2 py-1 text-[11px] text-muted-foreground">
              +{linkedFeatureNames.length - 2} more
            </span>
          ) : null}
        </div>
      ) : null}
      {descriptionPreview ? (
        <div className="mt-2 rounded-lg bg-background/35 px-2.5 py-2 text-xs leading-4 text-muted-foreground">
          {descriptionPreview}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleChecklist(card.id);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 transition hover:border-border hover:bg-background/60"
        >
          <CheckSquare className="h-3 w-3" />
          {checklistDone}/{card.checklist.length}
        </button>
        {loggedTimeLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5">
            <Clock3 className="h-3 w-3" />
            {loggedTimeLabel}
          </span>
        ) : null}
        {card.dueDate ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5">
            <Clock3 className="h-3 w-3" />
            {formatDueDate(card.dueDate)}
          </span>
        ) : null}
        {card.attachmentIds.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5">
            <Paperclip className="h-3 w-3" />
            {card.attachmentIds.length}
          </span>
        ) : null}
        {card.commentIds.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5">
            <MessageSquare className="h-3 w-3" />
            {card.commentIds.length}
          </span>
        ) : null}
        {card.cardKind === 'bug' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onScheduleBug(card);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 transition hover:border-border hover:bg-background/60"
            title="Schedule this bug in the current time slot"
          >
            <CalendarPlus className="h-3 w-3" />
            Schedule
          </button>
        ) : null}
      </div>
      {checklistExpanded && card.checklist.length > 0 ? (
        <div
          className="mt-3 space-y-1.5 rounded-lg border border-border/60 bg-background/35 p-2.5"
          onClick={(event) => event.stopPropagation()}
        >
          {card.checklist.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-[12px] leading-4 text-muted-foreground transition hover:bg-background/40"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggleChecklistItem(card.id, item.id)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              <span className={cn('flex-1', item.completed && 'line-through opacity-70')}>{item.text}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const BoardList = ({
  list,
  cards,
  labels,
  getLinkedFeatureNames,
  onOpenCard,
  onAddCard,
  onCardDragStart,
  onCardDragEnd,
  onCardDragOverList,
  onCardDragOverCard,
  onCardDrop,
  draggedCardId,
  dropTarget,
  editingTitle,
  editingTitleValue,
  onStartTitleEdit,
  onTitleEditChange,
  onCommitTitleEdit,
  onCancelTitleEdit,
  expandedChecklistCardIds,
  onToggleChecklist,
  onToggleChecklistItem,
  onScheduleBug,
  onOpenResource,
}: {
  list: KanbanList;
  cards: KanbanCard[];
  labels: KanbanLabel[];
  getLinkedFeatureNames: (card: KanbanCard) => string[];
  onOpenCard: (card: KanbanCard) => void;
  onAddCard: (listId: string) => void;
  onCardDragStart: (event: React.DragEvent<HTMLDivElement>, card: KanbanCard) => void;
  onCardDragEnd: () => void;
  onCardDragOverList: (event: React.DragEvent<HTMLDivElement>, listId: string) => void;
  onCardDragOverCard: (event: React.DragEvent<HTMLDivElement>, listId: string, beforeCardId: string) => void;
  onCardDrop: (event: React.DragEvent<HTMLDivElement>, listId: string, beforeCardId?: string | null) => void;
  draggedCardId: string | null;
  dropTarget: CardDropTarget | null;
  editingTitle: boolean;
  editingTitleValue: string;
  onStartTitleEdit: (list: KanbanList) => void;
  onTitleEditChange: (value: string) => void;
  onCommitTitleEdit: () => void;
  onCancelTitleEdit: () => void;
  expandedChecklistCardIds: string[];
  onToggleChecklist: (cardId: string) => void;
  onToggleChecklistItem: (cardId: string, itemId: string) => void;
  onScheduleBug: (card: KanbanCard) => void;
  onOpenResource: (card: KanbanCard) => void;
}) => (
  <div className="flex min-h-[460px] h-[calc(100vh-16rem)] flex-col overflow-hidden rounded-xl border border-border/60 bg-card/70">
    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: list.color || '#475569' }} />
        {editingTitle ? (
          <input
            autoFocus
            value={editingTitleValue}
            onChange={(event) => onTitleEditChange(event.target.value)}
            onBlur={onCommitTitleEdit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onCommitTitleEdit();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onCancelTitleEdit();
              }
            }}
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm font-semibold outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => onStartTitleEdit(list)}
            className="truncate text-left text-sm font-semibold text-foreground hover:text-primary"
          >
            {list.title}
          </button>
        )}
      </div>
      <Badge variant="secondary">{cards.length}</Badge>
    </div>
    <div
      className="flex-1 space-y-2.5 overflow-y-auto p-2.5"
      onDragOver={(event) => onCardDragOverList(event, list.id)}
      onDrop={(event) => onCardDrop(event, list.id, null)}
    >
      {cards.length > 0 ? (
        <>
          {cards.map((card) => (
            <React.Fragment key={card.id}>
              {dropTarget?.listId === list.id && dropTarget.beforeCardId === card.id ? (
                <div className="h-24 rounded-xl border-2 border-dashed border-primary/60 bg-primary/5" />
              ) : null}
              <div
                onDragOver={(event) => onCardDragOverCard(event, list.id, card.id)}
                onDrop={(event) => onCardDrop(event, list.id, card.id)}
              >
                <BoardCard
                  card={card}
                  labels={labels}
                  linkedFeatureNames={getLinkedFeatureNames(card)}
                  onOpen={onOpenCard}
                  onDragStart={onCardDragStart}
                  onDragEnd={onCardDragEnd}
                  isDragging={draggedCardId === card.id}
                  checklistExpanded={expandedChecklistCardIds.includes(card.id)}
                  onToggleChecklist={onToggleChecklist}
                  onToggleChecklistItem={onToggleChecklistItem}
                  onScheduleBug={onScheduleBug}
                  onOpenResource={onOpenResource}
                />
              </div>
            </React.Fragment>
          ))}
          {dropTarget?.listId === list.id && dropTarget.beforeCardId === null ? (
            <div className="h-24 rounded-xl border-2 border-dashed border-primary/60 bg-primary/5" />
          ) : null}
        </>
      ) : (
        <>
          {dropTarget?.listId === list.id ? (
            <div className="h-24 rounded-xl border-2 border-dashed border-primary/60 bg-primary/5" />
          ) : null}
          <div className="rounded-lg border border-dashed border-border/60 px-3 py-10 text-center text-sm text-muted-foreground">
            No cards
          </div>
        </>
      )}
    </div>
    <div className="border-t border-border/60 p-2.5">
      <button
        type="button"
        onClick={() => onAddCard(list.id)}
        className="w-full rounded-lg border border-dashed border-border/60 px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-border hover:bg-background/50 hover:text-foreground"
      >
        + Add card
      </button>
    </div>
  </div>
);

export function KanbanPageContent({
  isModal = false,
  forcedBoardMode,
  initialBoardId,
  initialCardId,
  onSelectCard,
}: KanbanPageContentProps) {
  const appliedInitialCardKeyRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const {
    schedule,
    setSchedule,
    currentSlot,
    allDeepWorkLogs,
    allUpskillLogs,
    allLeadGenLogs,
    deepWorkDefinitions,
    setDeepWorkDefinitions,
    setUpskillDefinitions,
    kanbanBoards,
    setKanbanBoards,
    refreshKanbanBoards,
    offerizationPlans,
    coreSkills,
    setCoreSkills,
    projects,
    resources,
    setResources,
    resourceFolders,
    setResourceFolders,
    openGeneralPopup,
    mindsetCards,
  } = useAuth();
  const { toast } = useToast();

  const [boardMode, setBoardMode] = useState<BoardMode>(forcedBoardMode || (isModal ? 'tasks' : 'project'));
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedFeatureFilterId, setSelectedFeatureFilterId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [cardDraft, setCardDraft] = useState<CardDraft | null>(null);
  const [cardLabelsDraft, setCardLabelsDraft] = useState<KanbanLabel[]>([]);
  const [newLabelTitle, setNewLabelTitle] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLOR_PALETTE[0]);
  const [selectedIntentionMicroSkillIds, setSelectedIntentionMicroSkillIds] = useState<string[]>([]);
  const [selectedSkillAreaId, setSelectedSkillAreaId] = useState('');
  const [newSkillAreaName, setNewSkillAreaName] = useState('');
  const [newMicroSkillName, setNewMicroSkillName] = useState('');
  const [editingMicroSkillId, setEditingMicroSkillId] = useState<string | null>(null);
  const [editingMicroSkillName, setEditingMicroSkillName] = useState('');
  const [newIntentionName, setNewIntentionName] = useState('');
  const [editingIntentionId, setEditingIntentionId] = useState<string | null>(null);
  const [editingIntentionName, setEditingIntentionName] = useState('');
  const [newBugIssueName, setNewBugIssueName] = useState('');
  const [pendingNewIntentions, setPendingNewIntentions] = useState<PendingIntentionDraft[]>([]);
  const [draggedCard, setDraggedCard] = useState<DraggedCardState | null>(null);
  const [dropTarget, setDropTarget] = useState<CardDropTarget | null>(null);
  const dropTargetRef = useRef<CardDropTarget | null>(null);
  const pendingDropTargetRef = useRef<CardDropTarget | null>(null);
  const dragOverFrameRef = useRef<number | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');
  const [expandedChecklistCardIds, setExpandedChecklistCardIds] = useState<string[]>([]);

  const taskBoard = useMemo<TaskBoardBuckets>(() => {
    const today = startOfToday();
    const todayKey = format(today, 'yyyy-MM-dd');
    const pending: any[] = [];
    const scheduled: any[] = [];
    const logged: any[] = [];
    const completed: any[] = [];

    Object.entries(schedule).forEach(([date, dailySchedule]) => {
      Object.entries(dailySchedule).forEach(([slot, activities]) => {
        if (!Array.isArray(activities)) return;
        activities.forEach((activity) => {
          const fullActivity = { ...activity, slot, date };
          if (isBefore(parseISO(date), today) && !activity.completed) {
            pending.push(fullActivity);
            return;
          }
          if (!isSameDay(parseISO(date), today)) return;
          if (activity.completed) {
            completed.push(fullActivity);
            return;
          }
          const hasLogs =
            (allDeepWorkLogs.find((log) => log.date === todayKey)?.exercises.some((exercise) => activity.taskIds?.includes(exercise.id) && exercise.loggedSets.length > 0)) ||
            (allUpskillLogs.find((log) => log.date === todayKey)?.exercises.some((exercise) => activity.taskIds?.includes(exercise.id) && exercise.loggedSets.length > 0)) ||
            (allLeadGenLogs.find((log) => log.date === todayKey)?.exercises.some((exercise) => activity.taskIds?.includes(exercise.id) && exercise.loggedSets.length > 0));
          if (hasLogs) {
            logged.push(fullActivity);
          } else {
            scheduled.push(fullActivity);
          }
        });
      });
    });

    Object.entries(schedule).forEach(([date, dailySchedule]) => {
      if (!isBefore(parseISO(date), today)) return;
      Object.entries(dailySchedule).forEach(([slot, activities]) => {
        if (!Array.isArray(activities)) return;
        activities.forEach((activity) => {
          if (activity.completed) {
            completed.push({ ...activity, slot, date });
          }
        });
      });
    });

    return { pending, scheduled, logged, completed };
  }, [schedule, allDeepWorkLogs, allUpskillLogs, allLeadGenLogs]);

  const specializationNames = useMemo(
    () =>
      new Map(
        coreSkills
          .filter((skill) => skill.type === 'Specialization')
          .map((skill) => [skill.id, skill.name])
      ),
    [coreSkills]
  );

  const releaseOptions = useMemo(
    () => getBoardReleaseOptions(offerizationPlans, specializationNames),
    [offerizationPlans, specializationNames]
  );
  const releaseOptionByKey = useMemo(
    () => new Map(releaseOptions.map((option) => [option.key, option] as const)),
    [releaseOptions]
  );

  const initialProjectBoard = useMemo(
    () =>
      initialBoardId
        ? kanbanBoards.find((board) => board.id === initialBoardId && (board.boardType || 'project') === 'project') || null
        : null,
    [initialBoardId, kanbanBoards]
  );

  const visibleBoards = useMemo(() => {
    const deduped = new Map<string, KanbanBoard>();
    const validReleaseKeys = new Set(releaseOptions.map((option) => `${option.specializationId}::${option.release.id}`));

    kanbanBoards.forEach((board) => {
      if (!board.releaseId || !board.specializationId) return;
      const key = `${board.specializationId}::${board.releaseId}`;
      if (!validReleaseKeys.has(key)) return;
      const current = deduped.get(key);
      if (!current) {
        deduped.set(key, board);
        return;
      }

      const releaseOption = releaseOptionByKey.get(key) || null;
      const currentRank = getProjectBoardScore(current, projects, releaseOption);
      const candidateRank = getProjectBoardScore(board, projects, releaseOption);
      if (
        candidateRank.score > currentRank.score ||
        (candidateRank.score === currentRank.score && candidateRank.updatedAtScore > currentRank.updatedAtScore)
      ) {
        deduped.set(key, board);
      }
    });

    const boards = Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (initialProjectBoard && !boards.some((board) => board.id === initialProjectBoard.id)) {
      return [initialProjectBoard, ...boards];
    }
    return boards;
  }, [initialProjectBoard, kanbanBoards, projects, releaseOptionByKey, releaseOptions]);

  useEffect(() => {
    if (forcedBoardMode && boardMode !== forcedBoardMode) {
      setBoardMode(forcedBoardMode);
    }
  }, [boardMode, forcedBoardMode]);

  useEffect(() => {
    if (!initialBoardId) return;
    if (!kanbanBoards.some((board) => board.id === initialBoardId)) return;
    if (selectedBoardId === initialBoardId) return;
    setSelectedBoardId(initialBoardId);
  }, [initialBoardId, kanbanBoards, selectedBoardId]);

  useEffect(() => {
    if (boardMode !== 'project') return;
    if (initialBoardId) return;
    const specId = searchParams.get('spec') || '';
    const releaseId = searchParams.get('release') || '';
    if (!specId || !releaseId) return;
    const matchedBoard = visibleBoards.find(
      (board) => board.specializationId === specId && board.releaseId === releaseId
    );
    if (matchedBoard && matchedBoard.id !== selectedBoardId) {
      setSelectedBoardId(matchedBoard.id);
    }
  }, [boardMode, searchParams, selectedBoardId, visibleBoards]);

  useEffect(() => {
    if (boardMode !== 'project') return;
    if (!selectedBoardId || !visibleBoards.some((board) => board.id === selectedBoardId)) {
      const fallbackBoardId = initialProjectBoard?.id || visibleBoards[0]?.id || '';
      if (fallbackBoardId !== selectedBoardId) {
        setSelectedBoardId(fallbackBoardId);
      }
    }
  }, [boardMode, initialProjectBoard, selectedBoardId, visibleBoards]);

  useEffect(() => {
    setSelectedFeatureFilterId('');
  }, [selectedBoardId]);

  const selectedProjectBoard = useMemo(
    () =>
      visibleBoards.find((board) => board.id === selectedBoardId) ||
      initialProjectBoard ||
      null,
    [initialProjectBoard, selectedBoardId, visibleBoards]
  );

  const selectedBoardMeta = useMemo(() => {
    if (!selectedProjectBoard) return null;
    const option = releaseOptions.find(
      (item) => item.release.id === selectedProjectBoard.releaseId && item.specializationId === selectedProjectBoard.specializationId
    );
    return option || null;
  }, [selectedProjectBoard, releaseOptions]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectBoard) return null;
    return (
      projects.find((project) => project.id === selectedProjectBoard.projectId) ||
      projects.find((project) => project.name === selectedProjectBoard.name) ||
      null
    );
  }, [projects, selectedProjectBoard]);

  const selectedBrandingBoard = useMemo(() => {
    if (!selectedProject?.id) return null;
    return kanbanBoards.find((board) => board.boardType === 'branding' && board.projectId === selectedProject.id) || null;
  }, [kanbanBoards, selectedProject]);

  const selectedBoard = boardMode === 'branding' ? selectedBrandingBoard : selectedProjectBoard;

  const linkedBothering = useMemo(() => {
    if (!selectedBoardMeta?.release?.workflowStages?.botheringText) return null;
    return selectedBoardMeta.release.workflowStages.botheringText;
  }, [selectedBoardMeta]);

  useEffect(() => {
    if (!initialCardId) {
      appliedInitialCardKeyRef.current = null;
    }
  }, [initialCardId]);

  const selectedSpecialization = useMemo(() => {
    if (!selectedProjectBoard?.specializationId) return null;
    return coreSkills.find((skill) => skill.id === selectedProjectBoard.specializationId) || null;
  }, [coreSkills, selectedProjectBoard]);

  useEffect(() => {
    if (boardMode !== 'branding' || !selectedProjectBoard || !selectedProject || selectedBrandingBoard) return;
    const timestamp = new Date().toISOString();
    const boardId = `branding_board_${selectedProject.id}`;
    const labels: KanbanBoard['labels'] = [];
    const lists: KanbanList[] = BRANDING_LIST_TEMPLATES.map((list, index) => ({
      id: `${boardId}_${list.key}`,
      boardId,
      title: list.title,
      color: list.color,
      cardOrder: [],
      position: index,
      archived: false,
    }));

    setKanbanBoards((prev) => {
      if (prev.some((board) => board.id === boardId)) return prev;
      return [
        ...prev,
        {
          id: boardId,
          name: `${selectedProject.name} Branding`,
          description: `${selectedProject.name} feature branding pipeline`,
          projectId: selectedProject.id,
          releaseId: selectedProjectBoard.releaseId || null,
          specializationId: selectedProjectBoard.specializationId || null,
          createdAt: timestamp,
          updatedAt: timestamp,
          listOrder: lists.map((list) => list.id),
          labels,
          lists,
          cards: [],
          attachments: [],
          comments: [],
          boardType: 'branding',
          migratedFromReleaseWorkflow: false,
        },
      ];
    });
  }, [boardMode, selectedBrandingBoard, selectedProject, selectedProjectBoard, setKanbanBoards]);

  const availableMicroSkills = useMemo(
    () =>
      (selectedSpecialization?.skillAreas || []).flatMap((area) =>
        area.microSkills.map((microSkill) => ({
          id: microSkill.id,
          name: microSkill.name,
          skillAreaName: area.name,
        }))
      ),
    [selectedSpecialization]
  );

  const availableMicroSkillGroups = useMemo(
    () =>
      (selectedSpecialization?.skillAreas || [])
        .map((area) => ({
          skillAreaId: area.id,
          skillAreaName: area.name,
          microSkills: area.microSkills.map((microSkill) => ({
            id: microSkill.id,
            name: microSkill.name,
          })),
        }))
        .filter((group) => group.microSkills.length > 0),
    [selectedSpecialization]
  );

  const selectedFeatureResource = useMemo(() => {
    if (!selectedProjectBoard) return null;
    const featureCardName = `${selectedProject?.name || selectedProjectBoard.name} Features`;
    const featureFolderId = resourceFolders.find((folder) => folder.name === 'Kanban Features' && folder.parentId === null)?.id || null;
    return (
      resources.find(
        (resource) =>
          resource.type === 'card' &&
          resource.name === featureCardName &&
          (!featureFolderId || resource.folderId === featureFolderId)
      ) || null
    );
  }, [resourceFolders, resources, selectedProject, selectedProjectBoard]);

  const featurePointOptions = useMemo(() => {
    return (selectedFeatureResource?.points || [])
      .filter((point) => (point.type === 'text' || point.type === 'todo') && point.text?.trim())
      .map((point) => ({
        id: point.id,
        name: point.text.trim(),
      }));
  }, [selectedFeatureResource]);

  const linkedFeatureLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    resources.forEach((resource) => {
      (resource.points || []).forEach((point) => {
        const text = point.text?.trim();
        if (!text) return;
        lookup.set(`${resource.id}:${point.id}`, text);
      });
    });
    return lookup;
  }, [resources]);

  const handleOpenFeaturesResource = useCallback(() => {
    if (!selectedProjectBoard) return;

    const now = new Date().toISOString();
    const featureFolderName = 'Kanban Features';
    const featureCardName = `${selectedProject?.name || selectedProjectBoard.name} Features`;

    let targetFolder = resourceFolders.find((folder) => folder.name === featureFolderName && folder.parentId === null) || null;
    const nextFolders = [...resourceFolders];

    if (!targetFolder) {
      targetFolder = {
        id: `folder_kanban_features_${Date.now()}`,
        name: featureFolderName,
        parentId: null,
        icon: 'Library',
      } as ResourceFolder;
      nextFolders.push(targetFolder);
      setResourceFolders(nextFolders);
    }

    let featureResource =
      resources.find((resource) => resource.folderId === targetFolder!.id && resource.name === featureCardName && resource.type === 'card') || null;

    if (!featureResource) {
      const seededPoints = (selectedProject?.features || []).length > 0
        ? selectedProject!.features.map((feature) => ({
            id: `point_feature_${feature.id}`,
            text: feature.name,
            type: 'todo' as const,
            checked: false,
          }))
        : [
            {
              id: `point_${Date.now()}_seed`,
              text: '',
              type: 'todo' as const,
              checked: false,
            },
          ];

      featureResource = {
        id: `res_feature_${Date.now()}`,
        name: featureCardName,
        folderId: targetFolder.id,
        type: 'card',
        createdAt: now,
        points: seededPoints,
        icon: 'Library',
      } as Resource;
      setResources((prev) => [...prev, featureResource!]);
    }

    openGeneralPopup(featureResource.id, null);
  }, [openGeneralPopup, resourceFolders, resources, selectedProject, selectedProjectBoard, setResourceFolders, setResources]);

  const handleOpenCardResource = useCallback((card: KanbanCard) => {
    const timestamp = new Date().toISOString();
    const rootFolderName = 'Kanban Card Resources';
    const boardFolderName = selectedProject?.name || selectedBoard?.name || 'Kanban Board';

    let nextFolders = [...resourceFolders];
    let rootFolder = nextFolders.find((folder) => folder.name === rootFolderName && folder.parentId === null) || null;
    if (!rootFolder) {
      rootFolder = {
        id: `folder_kanban_cards_${Date.now()}`,
        name: rootFolderName,
        parentId: null,
        icon: 'Library',
      } as ResourceFolder;
      nextFolders.push(rootFolder);
    }

    let boardFolder = nextFolders.find((folder) => folder.name === boardFolderName && folder.parentId === rootFolder!.id) || null;
    if (!boardFolder) {
      boardFolder = {
        id: `folder_kanban_board_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: boardFolderName,
        parentId: rootFolder!.id,
        icon: 'Library',
      } as ResourceFolder;
      nextFolders.push(boardFolder);
    }

    if (nextFolders.length !== resourceFolders.length) {
      setResourceFolders(nextFolders);
    }

    let resource =
      (card.linkedResourceId ? resources.find((entry) => entry.id === card.linkedResourceId) : null) ||
      null;

    if (!resource) {
      resource = {
        id: `res_kanban_card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: card.title || 'Kanban Card',
        folderId: boardFolder.id,
        type: 'card',
        createdAt: timestamp,
        points: buildDefaultPointsForResourceType('card', []),
        icon: 'Library',
      } as Resource;
      setResources((prev) => [...prev, resource!]);
      setKanbanBoards((prev) =>
        prev.map((board) =>
          board.id === card.boardId
            ? {
                ...board,
                cards: board.cards.map((entry) =>
                  entry.id === card.id ? { ...entry, linkedResourceId: resource!.id, updatedAt: timestamp } : entry
                ),
                updatedAt: timestamp,
              }
            : board
        )
      );
    } else {
      if (resource.name !== card.title || resource.folderId !== boardFolder.id) {
        const nextResource = {
          ...resource,
          name: card.title || resource.name,
          folderId: boardFolder.id,
        };
        resource = nextResource;
        setResources((prev) => prev.map((entry) => (entry.id === nextResource.id ? nextResource : entry)));
      }
      if (card.linkedResourceId !== resource.id) {
        setKanbanBoards((prev) =>
          prev.map((board) =>
            board.id === card.boardId
              ? {
                  ...board,
                  cards: board.cards.map((entry) =>
                    entry.id === card.id ? { ...entry, linkedResourceId: resource!.id, updatedAt: timestamp } : entry
                  ),
                  updatedAt: timestamp,
                }
              : board
          )
        );
      }
    }

    openGeneralPopup(resource.id, null);
  }, [openGeneralPopup, resourceFolders, resources, selectedBoard?.name, selectedProject?.name, setKanbanBoards, setResourceFolders, setResources]);

  const selectedLists = useMemo(() => {
    if (!selectedBoard) return [] as KanbanList[];
    const listMap = new Map(selectedBoard.lists.map((list) => [list.id, list]));
    return selectedBoard.listOrder
      .map((id) => listMap.get(id))
      .filter((list): list is KanbanList => !!list && !list.archived);
  }, [selectedBoard]);

  const filteredCardIds = useMemo(() => {
    if (!selectedBoard) return new Set<string>();
    const query = search.trim().toLowerCase();
    const selectedFeatureKey = selectedFeatureResource?.id && selectedFeatureFilterId
      ? `${selectedFeatureResource.id}:${selectedFeatureFilterId}`
      : '';
    return new Set(
      selectedBoard.cards
        .filter((card) => !card.archived)
        .filter((card) => {
          const linkedFeatureIds = card.linkedFeaturePointIds?.length
            ? card.linkedFeaturePointIds
            : card.linkedFeaturePointId
              ? [card.linkedFeaturePointId]
              : [];
          const linkedFeatureName = card.linkedFeatureResourceId
            ? linkedFeatureIds
                .map((pointId) => linkedFeatureLookup.get(`${card.linkedFeatureResourceId}:${pointId}`) || '')
                .filter(Boolean)
                .join(' ')
            : '';
          const matchesQuery = !query || `${card.title} ${card.description} ${linkedFeatureName}`.toLowerCase().includes(query);
          const matchesFeatureFilter =
            !selectedFeatureKey ||
            linkedFeatureIds.some((pointId) => `${card.linkedFeatureResourceId || ''}:${pointId}` === selectedFeatureKey);
          return matchesQuery && matchesFeatureFilter;
        })
        .map((card) => card.id)
    );
  }, [linkedFeatureLookup, search, selectedBoard, selectedFeatureFilterId, selectedFeatureResource]);

  const cardsByList = useMemo(() => {
    if (!selectedBoard) return new Map<string, KanbanCard[]>();
    const cardMap = new Map(selectedBoard.cards.map((card) => [card.id, card]));
    const next = new Map<string, KanbanCard[]>();
    selectedBoard.lists.forEach((list) => {
      next.set(
        list.id,
        list.cardOrder
          .map((id) => cardMap.get(id))
          .filter((card): card is KanbanCard => !!card && !card.archived)
          .filter((card) => filteredCardIds.has(card.id))
      );
    });
    return next;
  }, [selectedBoard, filteredCardIds]);

  const selectedCard = useMemo(() => {
    if (!selectedBoard || !selectedCardId) return null;
    return selectedBoard.cards.find((card) => card.id === selectedCardId) || null;
  }, [selectedBoard, selectedCardId]);

  const getLinkedFeatureNames = useCallback(
    (card: KanbanCard) => {
      const ids = card.linkedFeaturePointIds?.length
        ? card.linkedFeaturePointIds
        : card.linkedFeaturePointId
          ? [card.linkedFeaturePointId]
          : [];
      if (!card.linkedFeatureResourceId || ids.length === 0) return [];
      return ids
        .map((pointId) => linkedFeatureLookup.get(`${card.linkedFeatureResourceId}:${pointId}`) || '')
        .filter(Boolean);
    },
    [linkedFeatureLookup]
  );

  useEffect(() => {
    if (!selectedProjectBoard || !selectedFeatureResource) return;

    const doneList = getDoneList(selectedProjectBoard);
    if (!doneList) return;

    setResources((prev) => {
      let didChange = false;

      const nextResources = prev.map((resource) => {
        if (resource.id !== selectedFeatureResource.id) return resource;

        const nextPoints = resource.points.map((point) => {
          const linkedCards = selectedProjectBoard.cards.filter(
            (card) =>
              !card.archived &&
              card.linkedFeatureResourceId === resource.id &&
              card.linkedFeaturePointId === point.id
          );

          const shouldBeChecked = linkedCards.length > 0 && linkedCards.every((card) => card.listId === doneList.id);
          if (point.checked === shouldBeChecked) return point;

          didChange = true;
          return {
            ...point,
            checked: shouldBeChecked,
          };
        });

        return didChange ? { ...resource, points: nextPoints } : resource;
      });

      return didChange ? nextResources : prev;
    });
  }, [selectedFeatureResource, selectedProjectBoard, setResources]);

  const isBugCard = selectedCard?.cardKind === 'bug';

  const selectedListIndex = useMemo(() => {
    if (!cardDraft) return -1;
    return selectedLists.findIndex((list) => list.id === cardDraft.listId);
  }, [cardDraft, selectedLists]);

  const isBreakColumnCard = selectedListIndex >= 0 && selectedLists[selectedListIndex]?.title?.trim().toLowerCase() === 'break';

  const isReviewCard = Boolean(
    selectedCard &&
      boardMode === 'project' &&
      !isBugCard &&
      (selectedListIndex === 2 || (selectedLists.length > 0 && selectedListIndex === selectedLists.length - 1))
  );

  const availableLabelOptions = useMemo(() => {
    if (!cardDraft) return [] as KanbanLabel[];
    return cardLabelsDraft.filter((label) => !cardDraft.labelIds.includes(label.id));
  }, [cardDraft, cardLabelsDraft]);

  const filteredLabelOptions = useMemo(() => {
    const query = newLabelTitle.trim().toLowerCase();
    if (!query) return availableLabelOptions;
    return availableLabelOptions.filter((label) => label.title.toLowerCase().includes(query));
  }, [availableLabelOptions, newLabelTitle]);

  const exactExistingLabel = useMemo(() => {
    const query = newLabelTitle.trim().toLowerCase();
    if (!query) return null;
    return cardLabelsDraft.find((label) => label.title.toLowerCase() === query) || null;
  }, [cardLabelsDraft, newLabelTitle]);

  const initialMicroSkillId = availableMicroSkills[0]?.id || '';
  const initialSkillAreaId = selectedSpecialization?.skillAreas?.[0]?.id || '';

  const buildCardDraft = useCallback((card: KanbanCard): CardDraft => ({
    listId: card.listId,
    title: card.title,
    description: card.description,
    dueDate: card.dueDate || '',
    labelIds: [...card.labelIds],
    linkedFeaturePointId: card.linkedFeaturePointId || '',
    linkedFeaturePointIds: [...(card.linkedFeaturePointIds || (card.linkedFeaturePointId ? [card.linkedFeaturePointId] : []))],
    brandingType: card.brandingType || 'blog',
    linkedIntentionIds: [...card.linkedIntentionIds],
    checklist: card.checklist.map((item) => ({ ...item })),
  }), []);

  const openCardEditor = useCallback((card: KanbanCard, boardOverride?: KanbanBoard | null) => {
    if (onSelectCard) {
      onSelectCard(card);
      return;
    }
    const sourceBoard = boardOverride || selectedBoard;
    setSelectedCardId(card.id);
    setCardDraft(buildCardDraft(card));
    setCardLabelsDraft(mergeDefaultKanbanLabels(sourceBoard?.id || card.boardId, sourceBoard?.labels || []));
    setNewLabelTitle('');
    setNewLabelColor(LABEL_COLOR_PALETTE[0]);
    setSelectedIntentionMicroSkillIds(initialMicroSkillId ? [initialMicroSkillId] : []);
    setSelectedSkillAreaId(initialSkillAreaId);
    setNewSkillAreaName('');
    setNewMicroSkillName('');
    setEditingMicroSkillId(null);
    setEditingMicroSkillName('');
    setNewIntentionName('');
    setEditingIntentionId(null);
    setEditingIntentionName('');
    setNewBugIssueName('');
    setPendingNewIntentions([]);
  }, [
    buildCardDraft,
    initialMicroSkillId,
    initialSkillAreaId,
    onSelectCard,
    selectedBoard,
  ]);

  useEffect(() => {
    if (!initialCardId || !selectedBoard || onSelectCard) return;
    const initialCardKey = `${selectedBoard.id}:${initialCardId}`;
    if (appliedInitialCardKeyRef.current === initialCardKey) return;
    const initialCard = selectedBoard.cards.find((card) => card.id === initialCardId);
    if (!initialCard) return;
    appliedInitialCardKeyRef.current = initialCardKey;
    openCardEditor(initialCard, selectedBoard);
  }, [initialCardId, onSelectCard, openCardEditor, selectedBoard]);

  const handleDeleteActivity = (slot: string, activityId: string) => {
    const activity = [...taskBoard.pending, ...taskBoard.scheduled, ...taskBoard.logged, ...taskBoard.completed].find((entry) => entry.id === activityId);
    if (!activity) return;
    const { date } = activity;
    setSchedule((prev) => {
      const next = { ...prev };
      if (!next[date]) return prev;
      const daySchedule = { ...next[date] };
      if (!daySchedule[slot]) return prev;
      daySchedule[slot] = (daySchedule[slot] as any[]).filter((entry) => entry.id !== activityId);
      next[date] = daySchedule;
      return next;
    });
  };

  const openCard = (card: KanbanCard) => {
    openCardEditor(card, selectedBoard);
  };

  const handleAddCard = (listId: string) => {
    if (!selectedBoard) return;
    const timestamp = new Date().toISOString();
    const nextCardId = `kanban-card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextCard: KanbanCard = {
      id: nextCardId,
      boardId: selectedBoard.id,
      listId,
      cardKind: 'standard',
      title: 'New card',
      description: '',
      labelIds: [],
      dueDate: null,
      checklist: [],
      attachmentIds: [],
      commentIds: [],
      linkedFeatureResourceId: selectedFeatureResource?.id || null,
      linkedFeaturePointId: null,
      linkedFeaturePointIds: [],
      brandingType: boardMode === 'branding' ? 'blog' : null,
      linkedIntentionIds: [],
      workflowStageKey: null,
      parentCardId: null,
      linkedBugIntentionId: null,
      parentIntentionWasCompleted: false,
      resolvedAt: null,
      linkedProjectId: selectedBoard.projectId || null,
      linkedReleaseId: selectedBoard.releaseId || null,
      linkedResourceId: null,
      totalLoggedMinutes: 0,
      archived: false,
      position: (selectedBoard.cards.filter((card) => card.listId === listId).length) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setKanbanBoards((prev) =>
      prev.map((board) => {
        if (board.id !== selectedBoard.id) return board;
        return synchronizeBoardAutomation({
          ...board,
          cards: [...board.cards, nextCard],
          lists: board.lists.map((list) =>
            list.id === listId
              ? { ...list, cardOrder: [...list.cardOrder, nextCardId] }
              : list
          ),
          updatedAt: timestamp,
        }, timestamp);
      })
    );

    openCardEditor(nextCard, selectedBoard);
  };

  const handleScheduleBug = (card: KanbanCard) => {
    if (card.cardKind !== 'bug' || !currentSlot) return;
    const todayKey = format(startOfToday(), 'yyyy-MM-dd');
    const slot = currentSlot as SlotName;
    const nextActivity: Activity = {
      id: `bugs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'bugs',
      details: card.title,
      completed: false,
      slot,
      taskIds: [card.id],
    };

    setSchedule((prev) => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || {}),
        [slot]: [...(((prev[todayKey]?.[slot] as Activity[]) || [])), nextActivity],
      },
    }));
  };

  const handleCardDragStart = (event: React.DragEvent<HTMLDivElement>, card: KanbanCard) => {
    setDraggedCard({ cardId: card.id, fromListId: card.listId });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.id);

    const preview = event.currentTarget.cloneNode(true) as HTMLDivElement;
    preview.style.position = 'absolute';
    preview.style.top = '-1000px';
    preview.style.left = '-1000px';
    preview.style.width = `${event.currentTarget.clientWidth}px`;
    preview.style.transform = 'rotate(4deg)';
    preview.style.opacity = '0.96';
    preview.style.pointerEvents = 'none';
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, 24, 24);
    requestAnimationFrame(() => preview.remove());
  };

  const handleCardDragEnd = () => {
    setDraggedCard(null);
    setDropTarget(null);
    dropTargetRef.current = null;
    pendingDropTargetRef.current = null;
    if (dragOverFrameRef.current != null) {
      cancelAnimationFrame(dragOverFrameRef.current);
      dragOverFrameRef.current = null;
    }
  };

  const setDropTargetThrottled = useCallback((next: CardDropTarget) => {
    pendingDropTargetRef.current = next;
    if (dragOverFrameRef.current != null) return;
    dragOverFrameRef.current = requestAnimationFrame(() => {
      dragOverFrameRef.current = null;
      const pending = pendingDropTargetRef.current;
      pendingDropTargetRef.current = null;
      if (!pending) return;
      const current = dropTargetRef.current;
      if (current && current.listId === pending.listId && current.beforeCardId === pending.beforeCardId) return;
      dropTargetRef.current = pending;
      setDropTarget(pending);
    });
  }, []);

  const handleCardDragOverList = (event: React.DragEvent<HTMLDivElement>, listId: string) => {
    if (!draggedCard) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetThrottled({ listId, beforeCardId: null });
  };

  const handleCardDragOverCard = (event: React.DragEvent<HTMLDivElement>, listId: string, beforeCardId: string) => {
    if (!draggedCard || draggedCard.cardId === beforeCardId) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetThrottled({ listId, beforeCardId });
  };

  const moveCardToTarget = (targetListId: string, beforeCardId: string | null) => {
    if (!selectedBoard || !draggedCard) return;
    const timestamp = new Date().toISOString();

    setKanbanBoards((prev) =>
      prev.map((board) => {
        if (board.id !== selectedBoard.id) return board;
        return synchronizeBoardAutomation(
          moveCardWithinBoard(board, draggedCard.cardId, targetListId, beforeCardId, timestamp),
          timestamp
        );
      })
    );

    setDraggedCard(null);
    setDropTarget(null);
    dropTargetRef.current = null;
    pendingDropTargetRef.current = null;
    if (dragOverFrameRef.current != null) {
      cancelAnimationFrame(dragOverFrameRef.current);
      dragOverFrameRef.current = null;
    }
  };

  const handleCardDrop = (event: React.DragEvent<HTMLDivElement>, listId: string, beforeCardId: string | null = null) => {
    if (!draggedCard) return;
    event.preventDefault();
    event.stopPropagation();
    moveCardToTarget(listId, beforeCardId);
  };

  const toggleChecklistExpansion = (cardId: string) => {
    setExpandedChecklistCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const toggleBoardChecklistItem = (cardId: string, itemId: string) => {
    if (!selectedBoard) return;
    const timestamp = new Date().toISOString();
    setKanbanBoards((prev) =>
      prev.map((board) => {
        if (board.id !== selectedBoard.id) return board;

        let toggledCardId: string | null = null;
        const nextCards = board.cards.map((card) => {
          if (card.id !== cardId) return card;
          toggledCardId = card.id;
          return {
            ...card,
            checklist: card.checklist.map((item) =>
              item.id !== itemId ? item : { ...item, completed: !item.completed }
            ),
            updatedAt: timestamp,
          };
        });

        let nextBoard: KanbanBoard = {
          ...board,
          cards: nextCards,
          updatedAt: timestamp,
        };

        const toggledCard = toggledCardId ? nextBoard.cards.find((card) => card.id === toggledCardId) : null;
        const shouldAdvance =
          !!toggledCard &&
          toggledCard.checklist.length > 0 &&
          toggledCard.checklist.every((item) => item.completed);

        if (!shouldAdvance || !toggledCard) return synchronizeBoardAutomation(nextBoard, timestamp);

        if (toggledCard.cardKind === 'bug') {
          return resolveBugCard(nextBoard, toggledCard.id, timestamp);
        }

        const orderedLists = getOrderedBoardLists(nextBoard);
        const currentListIndex = orderedLists.findIndex((list) => list.id === toggledCard.listId);
        const doneList = getDoneList(nextBoard);
        const nextList = currentListIndex === 2 ? doneList : currentListIndex >= 0 ? orderedLists[currentListIndex + 1] : null;

        if (!nextList || nextList.id === toggledCard.listId) return synchronizeBoardAutomation(nextBoard, timestamp);

        return synchronizeBoardAutomation(
          moveCardWithinBoard(nextBoard, toggledCard.id, nextList.id, null, timestamp),
          timestamp
        );
      })
    );
  };

  const startListTitleEdit = (list: KanbanList) => {
    setEditingListId(list.id);
    setEditingListTitle(list.title);
  };

  const cancelListTitleEdit = () => {
    setEditingListId(null);
    setEditingListTitle('');
  };

  const commitListTitleEdit = () => {
    if (!selectedBoard || !editingListId) return cancelListTitleEdit();
    const nextTitle = editingListTitle.trim();
    if (!nextTitle) return cancelListTitleEdit();
    const timestamp = new Date().toISOString();

    setKanbanBoards((prev) =>
      prev.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              lists: board.lists.map((list) =>
                list.id === editingListId ? { ...list, title: nextTitle } : list
              ),
              updatedAt: timestamp,
            }
          : board
      )
    );

    cancelListTitleEdit();
  };

  const closeCard = () => {
    setSelectedCardId('');
    setCardDraft(null);
    setCardLabelsDraft([]);
    setNewLabelTitle('');
    setNewLabelColor(LABEL_COLOR_PALETTE[0]);
    setSelectedIntentionMicroSkillIds([]);
    setSelectedSkillAreaId('');
    setNewSkillAreaName('');
    setNewMicroSkillName('');
    setEditingMicroSkillId(null);
    setEditingMicroSkillName('');
    setNewIntentionName('');
    setEditingIntentionId(null);
    setEditingIntentionName('');
    setNewBugIssueName('');
    setPendingNewIntentions([]);
  };

  const toggleDraftLabel = (labelId: string) => {
    setCardDraft((prev) => {
      if (!prev) return prev;
      const hasLabel = prev.labelIds.includes(labelId);
      return {
        ...prev,
        labelIds: hasLabel ? prev.labelIds.filter((id) => id !== labelId) : [...prev.labelIds, labelId],
      };
    });
  };

  const handleCreateDraftLabel = () => {
    const title = newLabelTitle.trim();
    if (!selectedBoard || !title) return;
    if (cardLabelsDraft.some((label) => label.title.toLowerCase() === title.toLowerCase())) return;

    const label: KanbanLabel = {
      id: `${selectedBoard.id}-label-${Date.now()}`,
      boardId: selectedBoard.id,
      title,
      color: newLabelColor,
    };

    setCardLabelsDraft((prev) => [...prev, label]);
    setCardDraft((prev) => (prev ? { ...prev, labelIds: [...prev.labelIds, label.id] } : prev));
    setNewLabelTitle('');
    setNewLabelColor(LABEL_COLOR_PALETTE[0]);
  };

  const handleApplyLabelInput = () => {
    const title = newLabelTitle.trim();
    if (!title) return;

    if (exactExistingLabel) {
      if (!cardDraft?.labelIds.includes(exactExistingLabel.id)) {
        toggleDraftLabel(exactExistingLabel.id);
      }
      setNewLabelTitle('');
      return;
    }

    handleCreateDraftLabel();
  };

  const updateDraftLabel = (labelId: string, updates: Partial<KanbanLabel>) => {
    setCardLabelsDraft((prev) => prev.map((label) => (label.id === labelId ? { ...label, ...updates } : label)));
  };

  const deleteDraftLabel = (labelId: string) => {
    setCardLabelsDraft((prev) => prev.filter((label) => label.id !== labelId));
    setCardDraft((prev) => (prev ? { ...prev, labelIds: prev.labelIds.filter((id) => id !== labelId) } : prev));
  };

  const addDefaultLabelSet = (prefix: 'Severity' | 'Priority') => {
    if (!selectedBoard) return;
    setCardLabelsDraft((prev) => {
      const next = mergeDefaultKanbanLabels(selectedBoard.id, prev);
      return next.filter((label, index, list) => list.findIndex((entry) => entry.id === label.id) === index);
    });
    const firstMatching = DEFAULT_KANBAN_LABELS.find((label) => label.title.startsWith(prefix));
    if (firstMatching) {
      const existing = cardLabelsDraft.find((label) => label.title.toLowerCase() === firstMatching.title.toLowerCase());
      if (existing && !cardDraft?.labelIds.includes(existing.id)) {
        toggleDraftLabel(existing.id);
      }
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    setCardDraft((prev) => (
      prev
        ? {
            ...prev,
            checklist: prev.checklist.map((item) =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
          }
        : prev
    ));
  };

  const selectedIntentionMicroSkills = useMemo(
    () => availableMicroSkills.filter((microSkill) => selectedIntentionMicroSkillIds.includes(microSkill.id)),
    [availableMicroSkills, selectedIntentionMicroSkillIds]
  );

  const existingProjectIntentions = useMemo(() => {
    if (!selectedProject) return [] as ExerciseDefinition[];
    return deepWorkDefinitions.filter((definition) => {
      if (definition.nodeType !== 'Intention') return false;
      const projectMatch =
        definition.primaryProjectId === selectedProject.id ||
        Boolean(definition.linkedProjectIds?.includes(selectedProject.id));
      if (!projectMatch) return false;
      if (selectedIntentionMicroSkillIds.length === 0) return true;
      return (
        Boolean(definition.linkedMicroSkillIds?.some((id) => selectedIntentionMicroSkillIds.includes(id))) ||
        selectedIntentionMicroSkills.some((microSkill) => microSkill.name === definition.category)
      );
    });
  }, [deepWorkDefinitions, selectedIntentionMicroSkillIds, selectedIntentionMicroSkills, selectedProject]);

  const visibleIntentionOptions = useMemo(() => {
    const pending = pendingNewIntentions
      .filter((draft) =>
        selectedIntentionMicroSkillIds.length === 0 ||
        draft.microSkillIds.some((id) => selectedIntentionMicroSkillIds.includes(id))
      )
      .map((draft) => ({
        id: draft.tempId,
        name: draft.name,
        description: '',
        microSkillNames: draft.microSkillNames,
        kind: 'pending' as const,
      }));

    const existing = existingProjectIntentions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      description: definition.description || '',
      microSkillNames:
        availableMicroSkills
          .filter((microSkill) => (definition.linkedMicroSkillIds || []).includes(microSkill.id))
          .map((microSkill) => microSkill.name)
          .concat(
            definition.linkedMicroSkillIds?.length ? [] : definition.category ? [definition.category] : []
          )
          .filter((name, index, list) => list.indexOf(name) === index),
      kind: 'existing' as const,
    }));

    return [...pending, ...existing].filter((option) => !cardDraft?.linkedIntentionIds.includes(option.id));
  }, [availableMicroSkills, cardDraft?.linkedIntentionIds, existingProjectIntentions, pendingNewIntentions, selectedIntentionMicroSkillIds]);

  const editableIntentions = useMemo(() => {
    const pendingMap = new Map(pendingNewIntentions.map((draft) => [draft.tempId, draft]));
    return cardDraft?.checklist
      .map((item) => {
        const intentionId = item.linkedIntentionId;
        if (!intentionId) return null;
        const pending = pendingMap.get(intentionId);
        if (pending) {
          return {
            id: intentionId,
            name: pending.name,
            description: '',
            microSkillNames: pending.microSkillNames,
            kind: 'pending' as const,
          } satisfies EditableIntentionOption;
        }
        const definition = deepWorkDefinitions.find((entry) => entry.id === intentionId);
        if (!definition) return null;
        return {
          id: intentionId,
          name: definition.name,
          description: definition.description || '',
          microSkillNames:
            availableMicroSkills
              .filter((microSkill) => (definition.linkedMicroSkillIds || []).includes(microSkill.id))
              .map((microSkill) => microSkill.name)
              .concat(definition.category ? [definition.category] : [])
              .filter((name, index, list) => list.indexOf(name) === index),
          kind: 'existing' as const,
        } satisfies EditableIntentionOption;
      })
      .filter((value): value is EditableIntentionOption => !!value) || [];
  }, [availableMicroSkills, cardDraft?.checklist, deepWorkDefinitions, pendingNewIntentions]);

  const openBugCardsByIntention = useMemo(() => {
    const map = new Map<string, KanbanCard>();
    if (!selectedBoard || !selectedCard) return map;

    selectedBoard.cards.forEach((card) => {
      if (
        card.cardKind === 'bug' &&
        !card.archived &&
        card.parentCardId === selectedCard.id &&
        card.linkedBugIntentionId &&
        !map.has(card.linkedBugIntentionId)
      ) {
        map.set(card.linkedBugIntentionId, card);
      }
    });

    return map;
  }, [selectedBoard, selectedCard]);

  const bugHistoryByIntention = useMemo(() => {
    const map = new Map<string, KanbanCard[]>();
    if (!selectedBoard || !selectedCard) return map;

    selectedBoard.cards.forEach((card) => {
      if (
        card.cardKind === 'bug' &&
        card.archived &&
        card.parentCardId === selectedCard.id &&
        card.linkedBugIntentionId
      ) {
        const existing = map.get(card.linkedBugIntentionId) || [];
        existing.push(card);
        map.set(card.linkedBugIntentionId, existing);
      }
    });

    map.forEach((cards, intentionId) => {
      map.set(
        intentionId,
        [...cards].sort((a, b) => (b.resolvedAt || '').localeCompare(a.resolvedAt || ''))
      );
    });

    return map;
  }, [selectedBoard, selectedCard]);

  const selectedBugIntention = useMemo(() => {
    if (!selectedCard?.linkedBugIntentionId) return null;
    return deepWorkDefinitions.find((definition) => definition.id === selectedCard.linkedBugIntentionId) || null;
  }, [deepWorkDefinitions, selectedCard]);

  const selectedBugParentCard = useMemo(() => {
    if (!selectedBoard || !selectedCard?.parentCardId) return null;
    return selectedBoard.cards.find((card) => card.id === selectedCard.parentCardId) || null;
  }, [selectedBoard, selectedCard]);

  const syncChecklistWithIntentions = (linkedIntentionIds: string[], previousChecklist: KanbanCard['checklist']) => {
    const previousByIntentionId = new Map(
      previousChecklist
        .filter((item) => item.linkedIntentionId)
        .map((item) => [item.linkedIntentionId as string, item])
    );
    const pendingById = new Map(pendingNewIntentions.map((draft) => [draft.tempId, draft]));

    return linkedIntentionIds
      .map((intentionId) => {
        const definition = deepWorkDefinitions.find((item) => item.id === intentionId);
        const pending = pendingById.get(intentionId);
        if (!definition && !pending) return null;
        const previous = previousByIntentionId.get(intentionId);
        return {
          id: previous?.id || `check-${intentionId}`,
          text: definition?.name || pending?.name || '',
          completed: previous?.completed || false,
          linkedIntentionId: intentionId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item);
  };

  const toggleLinkedIntention = (intentionId: string) => {
    setCardDraft((prev) => {
      if (!prev) return prev;
      const linked = prev.linkedIntentionIds.includes(intentionId);
      const nextLinkedIds = linked
        ? prev.linkedIntentionIds.filter((id) => id !== intentionId)
        : [...prev.linkedIntentionIds, intentionId];
      return {
        ...prev,
        linkedIntentionIds: nextLinkedIds,
        checklist: syncChecklistWithIntentions(nextLinkedIds, prev.checklist),
      };
    });
  };

  const removeLinkedIntention = (intentionId?: string, checklistItemId?: string) => {
    setCardDraft((prev) => {
      if (!prev) return prev;

      if (intentionId) {
        const nextLinkedIds = prev.linkedIntentionIds.filter((id) => id !== intentionId);
        return {
          ...prev,
          linkedIntentionIds: nextLinkedIds,
          checklist: syncChecklistWithIntentions(nextLinkedIds, prev.checklist),
        };
      }

      if (!checklistItemId) return prev;

      return {
        ...prev,
        checklist: prev.checklist.filter((item) => item.id !== checklistItemId),
      };
    });
  };

  const addBugIssueDraft = () => {
    const text = newBugIssueName.trim();
    if (!text) return;

    setCardDraft((prev) =>
      prev
        ? {
            ...prev,
            checklist: [
              ...prev.checklist,
              {
                id: `bug-issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                text,
                completed: false,
              },
            ],
          }
        : prev
    );
    setNewBugIssueName('');
  };

  const openBugCard = (bugCardId: string) => {
    const bugCard = selectedBoard?.cards.find((card) => card.id === bugCardId) || null;
    if (!bugCard) {
      setSelectedCardId(bugCardId);
      return;
    }
    openCardEditor(bugCard, selectedBoard);
  };

  const handleCreateBugCard = (intentionId: string, intentionText: string) => {
    if (!selectedBoard || !selectedCard || !cardDraft) return;

    const existingBugCard = openBugCardsByIntention.get(intentionId);
    if (existingBugCard) {
      openBugCard(existingBugCard.id);
      return;
    }

    const breakList = selectedLists.find((list) => normalizeKanbanTitle(list.title) === 'break') || null;
    const targetList = breakList || (selectedLists.find((list) => list.id === cardDraft.listId) ?? null);
    if (!targetList) return;

    const parentChecklistItem = cardDraft.checklist.find((item) => item.linkedIntentionId === intentionId);
    const timestamp = new Date().toISOString();
    const nextCardId = `kanban-bug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextBugCard: KanbanCard = {
      id: nextCardId,
      boardId: selectedBoard.id,
      listId: targetList.id,
      cardKind: 'bug',
      title: `Bug: ${intentionText}`,
      description: '',
      labelIds: [],
      dueDate: null,
      checklist: [],
      attachmentIds: [],
      commentIds: [],
      linkedIntentionIds: [],
      workflowStageKey: 'fix',
      parentCardId: selectedCard.id,
      linkedBugIntentionId: intentionId,
      parentIntentionWasCompleted: Boolean(parentChecklistItem?.completed),
      resolvedAt: null,
      linkedProjectId: selectedBoard.projectId || null,
      linkedReleaseId: selectedBoard.releaseId || null,
      linkedResourceId: null,
      totalLoggedMinutes: 0,
      archived: false,
      position: selectedBoard.cards.filter((card) => card.listId === targetList.id && !card.archived).length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setKanbanBoards((prev) =>
      prev.map((board) => {
        if (board.id !== selectedBoard.id) return board;
        let nextBoard: KanbanBoard = {
          ...board,
          cards: [
            ...board.cards.map((card) =>
              card.id === selectedCard.id
                ? {
                    ...card,
                    checklist: card.checklist.map((item) =>
                      item.linkedIntentionId === intentionId ? { ...item, completed: false } : item
                    ),
                    updatedAt: timestamp,
                  }
                : card
            ),
            nextBugCard,
          ],
          lists: board.lists.map((list) =>
            list.id === targetList.id
              ? { ...list, cardOrder: [...list.cardOrder, nextCardId] }
              : list
          ),
          updatedAt: timestamp,
        };

        return synchronizeBoardAutomation(nextBoard, timestamp);
      })
    );

    setCardDraft((prev) =>
      prev
        ? {
            ...prev,
            listId: breakList?.id || prev.listId,
            checklist: prev.checklist.map((item) =>
              item.linkedIntentionId === intentionId ? { ...item, completed: false } : item
            ),
          }
        : prev
    );
  };

  const handleAddNewIntentionDraft = () => {
    const name = newIntentionName.trim();
    if (!name || selectedIntentionMicroSkills.length === 0) return;

    const tempId = `temp-intention-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextDraft: PendingIntentionDraft = {
      tempId,
      name,
      microSkillIds: selectedIntentionMicroSkills.map((microSkill) => microSkill.id),
      microSkillNames: selectedIntentionMicroSkills.map((microSkill) => microSkill.name),
    };

    setPendingNewIntentions((prev) => [...prev, nextDraft]);
    setCardDraft((prev) => {
      if (!prev) return prev;
      const nextLinkedIds = [...prev.linkedIntentionIds, tempId];
      const nextChecklist = [
        ...prev.checklist,
        {
          id: `check-${tempId}`,
          text: name,
          completed: false,
          linkedIntentionId: tempId,
        },
      ];
      return {
        ...prev,
        linkedIntentionIds: nextLinkedIds,
        checklist: nextChecklist,
      };
    });
    setNewIntentionName('');
  };

  const startEditingIntention = (intentionId: string, currentName: string) => {
    setEditingIntentionId(intentionId);
    setEditingIntentionName(currentName);
  };

  const saveIntentionEdit = () => {
    const nextName = editingIntentionName.trim();
    if (!editingIntentionId || !nextName) return;

    setPendingNewIntentions((prev) =>
      prev.map((draft) => (draft.tempId === editingIntentionId ? { ...draft, name: nextName } : draft))
    );
    setDeepWorkDefinitions((prev) =>
      prev.map((definition) => (definition.id === editingIntentionId ? { ...definition, name: nextName } : definition))
    );
    setCardDraft((prev) =>
      prev
        ? {
            ...prev,
            checklist: prev.checklist.map((item) =>
              item.linkedIntentionId === editingIntentionId ? { ...item, text: nextName } : item
            ),
          }
        : prev
    );
    setEditingIntentionId(null);
    setEditingIntentionName('');
  };

  const deleteIntentionFromPopup = (intentionId: string) => {
    setPendingNewIntentions((prev) => prev.filter((draft) => draft.tempId !== intentionId));
    setDeepWorkDefinitions((prev) => prev.filter((definition) => definition.id !== intentionId));
    removeLinkedIntention(intentionId);
    if (editingIntentionId === intentionId) {
      setEditingIntentionId(null);
      setEditingIntentionName('');
    }
  };

  const startEditingMicroSkill = (microSkillId: string, currentName: string) => {
    setEditingMicroSkillId(microSkillId);
    setEditingMicroSkillName(currentName);
  };

  const saveMicroSkillEdit = (skillAreaId: string, microSkillId: string) => {
    const nextName = editingMicroSkillName.trim();
    if (!selectedSpecialization || !nextName) return;

    let oldName = '';
    setCoreSkills((prev) =>
      prev.map((skill) => {
        if (skill.id !== selectedSpecialization.id) return skill;
        return {
          ...skill,
          skillAreas: skill.skillAreas.map((area) => {
            if (area.id !== skillAreaId) return area;
            return {
              ...area,
              microSkills: area.microSkills.map((microSkill) => {
                if (microSkill.id !== microSkillId) return microSkill;
                oldName = microSkill.name;
                return { ...microSkill, name: nextName };
              }),
            };
          }),
        };
      })
    );

    if (oldName && oldName !== nextName) {
      const updateCategory = (definitions: ExerciseDefinition[]) =>
        definitions.map((definition) => (definition.category === oldName ? { ...definition, category: nextName as any } : definition));
      setDeepWorkDefinitions((prev) => updateCategory(prev));
      setUpskillDefinitions((prev) => updateCategory(prev));
      setPendingNewIntentions((prev) =>
        prev.map((draft) => ({
          ...draft,
          microSkillNames: draft.microSkillNames.map((name) => (name === oldName ? nextName : name)),
        }))
      );
    }

    setEditingMicroSkillId(null);
    setEditingMicroSkillName('');
  };

  const deleteMicroSkillFromPopup = (skillAreaId: string, microSkillId: string) => {
    if (!selectedSpecialization) return;

    let deletedName = '';
    setCoreSkills((prev) =>
      prev.map((skill) => {
        if (skill.id !== selectedSpecialization.id) return skill;
        return {
          ...skill,
          skillAreas: skill.skillAreas.map((area) => {
            if (area.id !== skillAreaId) return area;
            const target = area.microSkills.find((microSkill) => microSkill.id === microSkillId);
            if (target) deletedName = target.name;
            return {
              ...area,
              microSkills: area.microSkills.filter((microSkill) => microSkill.id !== microSkillId),
            };
          }),
        };
      })
    );

    setSelectedIntentionMicroSkillIds((prev) => prev.filter((id) => id !== microSkillId));
    setPendingNewIntentions((prev) =>
      prev.map((draft) => ({
        ...draft,
        microSkillIds: draft.microSkillIds.filter((id) => id !== microSkillId),
        microSkillNames: deletedName ? draft.microSkillNames.filter((name) => name !== deletedName) : draft.microSkillNames,
      }))
    );

    if (deletedName) {
      setDeepWorkDefinitions((prev) => prev.filter((definition) => definition.category !== deletedName));
      setUpskillDefinitions((prev) => prev.filter((definition) => definition.category !== deletedName));
    }

    if (editingMicroSkillId === microSkillId) {
      setEditingMicroSkillId(null);
      setEditingMicroSkillName('');
    }
  };

  const addMicroSkillFromPopup = () => {
    const nextMicroSkillName = newMicroSkillName.trim();
    if (!selectedSpecialization || !nextMicroSkillName) return;

    const usingNewSkillArea = selectedSkillAreaId === '__new__';
    const nextSkillAreaName = usingNewSkillArea ? newSkillAreaName.trim() : '';
    if (usingNewSkillArea && !nextSkillAreaName) {
      toast({ title: 'Skill area required', description: 'Create or choose a skill area first.', variant: 'destructive' });
      return;
    }

    let createdAreaId = '';
    let createdMicroSkillId = '';
    let duplicateFound = false;

    setCoreSkills((prev) =>
      prev.map((skill) => {
        if (skill.id !== selectedSpecialization.id) return skill;

        const nextSkillAreas = [...skill.skillAreas];
        let targetAreaIndex = nextSkillAreas.findIndex((area) => area.id === selectedSkillAreaId);

        if (usingNewSkillArea) {
          createdAreaId = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          nextSkillAreas.push({
            id: createdAreaId,
            name: nextSkillAreaName,
            purpose: '',
            microSkills: [],
          });
          targetAreaIndex = nextSkillAreas.length - 1;
        }

        if (targetAreaIndex < 0) return skill;

        const targetArea = nextSkillAreas[targetAreaIndex];
        if (targetArea.microSkills.some((microSkill) => microSkill.name.trim().toLowerCase() === nextMicroSkillName.toLowerCase())) {
          duplicateFound = true;
          return skill;
        }

        createdMicroSkillId = `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        nextSkillAreas[targetAreaIndex] = {
          ...targetArea,
          microSkills: [
            ...targetArea.microSkills,
            {
              id: createdMicroSkillId,
              name: nextMicroSkillName,
              isReadyForRepetition: false,
            },
          ],
        };

        return {
          ...skill,
          skillAreas: nextSkillAreas,
        };
      })
    );

    if (duplicateFound) {
      toast({ title: 'Micro-skill already exists', description: `"${nextMicroSkillName}" is already in that skill area.`, variant: 'destructive' });
      return;
    }

    if (createdAreaId) {
      setSelectedSkillAreaId(createdAreaId);
      setNewSkillAreaName('');
    }
    if (createdMicroSkillId) {
      setSelectedIntentionMicroSkillIds((prev) => (prev.includes(createdMicroSkillId) ? prev : [...prev, createdMicroSkillId]));
    }
    setNewMicroSkillName('');
  };

  const getDraftFeatureNames = () => {
    if (!selectedFeatureResource || !cardDraft) return [] as string[];
    const pointIds =
      boardMode === 'branding'
        ? cardDraft.linkedFeaturePointIds
        : cardDraft.linkedFeaturePointId
          ? [cardDraft.linkedFeaturePointId]
          : [];
    return pointIds
      .map((pointId) => selectedFeatureResource.points.find((point) => point.id === pointId)?.text?.trim() || '')
      .filter(Boolean);
  };

  const copyIntentionsToClipboard = async () => {
    if (!cardDraft) return;
    const featureNames = getDraftFeatureNames();
    const intentionLines = cardDraft.checklist.map((item) => `- ${item.text}`);
    const text = [
      `Task Card: ${cardDraft.title.trim() || 'Untitled card'}`,
      `Feature Name: ${featureNames.length > 0 ? featureNames.join(', ') : 'None'}`,
      'Intentions:',
      ...(intentionLines.length > 0 ? intentionLines : ['- None']),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Task title, feature name, and intentions were copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy intentions to the clipboard.', variant: 'destructive' });
    }
  };

  const copyBugIssuesToClipboard = async () => {
    if (!cardDraft) return;
    const parentCardName = selectedBugParentCard?.title?.trim() || 'Unknown parent card';
    const featureNames = selectedBugParentCard ? getLinkedFeatureNames(selectedBugParentCard) : [];
    const issueLines = cardDraft.checklist.map((item) => `- ${item.text}`);
    const text = [
      `Parent Card: ${parentCardName}`,
      `Feature Name: ${featureNames.length > 0 ? featureNames.join(', ') : 'None'}`,
      'Issues:',
      ...(issueLines.length > 0 ? issueLines : ['- None']),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Parent card, feature name, and issues were copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy issues to the clipboard.', variant: 'destructive' });
    }
  };

  const handleSaveCard = () => {
    if (!selectedBoard || !selectedCard || !cardDraft) return;
    const nextTitle = cardDraft.title.trim();
    if (!nextTitle) return;
    const sanitizedLabels = cardLabelsDraft
      .map((label) => ({ ...label, title: label.title.trim() }))
      .filter((label) => label.title);

    const isSavingBugCard = selectedCard.cardKind === 'bug';
    const previousListId = selectedCard.listId;
    const nextListId = cardDraft.listId;
    const timestamp = new Date().toISOString();
    const pendingIdMap = new Map<string, string>();
    const definitionsToCreate: ExerciseDefinition[] = isSavingBugCard
      ? []
      : pendingNewIntentions
          .filter((draft) => cardDraft.linkedIntentionIds.includes(draft.tempId))
          .map((draft) => {
            const realId = `deepwork-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            pendingIdMap.set(draft.tempId, realId);
            return {
              id: realId,
              name: draft.name,
              category: (draft.microSkillNames[0] || 'Commentary') as ExerciseDefinition['category'],
              description: '',
              linkedProjectIds: selectedProject ? [selectedProject.id] : [],
              primaryProjectId: selectedProject?.id || null,
              linkedMicroSkillIds: draft.microSkillIds,
              nodeType: 'Intention',
            };
          });

    if (definitionsToCreate.length > 0) {
      setDeepWorkDefinitions((prev) => [...prev, ...definitionsToCreate]);
    }

    const finalLinkedIntentionIds = cardDraft.linkedIntentionIds.map((id) => pendingIdMap.get(id) || id);
    const finalLinkedFeaturePointIds = boardMode === 'branding'
      ? cardDraft.linkedFeaturePointIds
      : (cardDraft.linkedFeaturePointId ? [cardDraft.linkedFeaturePointId] : []);
    const primaryLinkedFeaturePointId =
      boardMode === 'branding'
        ? finalLinkedFeaturePointIds[0] || null
        : (cardDraft.linkedFeaturePointId || null);
    const finalChecklist = cardDraft.checklist.map((item) => ({
      ...item,
      linkedIntentionId: item.linkedIntentionId ? pendingIdMap.get(item.linkedIntentionId) || item.linkedIntentionId : undefined,
      id: item.linkedIntentionId && pendingIdMap.has(item.linkedIntentionId)
        ? `check-${pendingIdMap.get(item.linkedIntentionId)}`
        : item.id,
    }));

    setKanbanBoards((prev) =>
      prev.map((board) => {
        if (board.id !== selectedBoard.id) return board;

        const nextCards = board.cards.map((card) =>
          card.id === selectedCard.id
            ? {
                ...card,
                listId: nextListId,
                title: nextTitle,
                description: cardDraft.description.trim(),
                dueDate: cardDraft.dueDate || null,
                labelIds: cardDraft.labelIds,
                linkedFeatureResourceId: selectedFeatureResource?.id || null,
                linkedFeaturePointId: primaryLinkedFeaturePointId,
                linkedFeaturePointIds: finalLinkedFeaturePointIds,
                brandingType: boardMode === 'branding' ? cardDraft.brandingType : null,
                linkedIntentionIds: finalLinkedIntentionIds,
                checklist: finalChecklist,
                updatedAt: timestamp,
              }
            : card
        );

        const nextLists = board.lists.map((list) => {
          let cardOrder = list.cardOrder;
          if (list.id === previousListId && previousListId !== nextListId) {
            cardOrder = cardOrder.filter((cardId) => cardId !== selectedCard.id);
          }
          if (list.id === nextListId) {
            const withoutCard = cardOrder.filter((cardId) => cardId !== selectedCard.id);
            cardOrder = [...withoutCard, selectedCard.id];
          }
          return { ...list, cardOrder };
        });

        let nextBoard: KanbanBoard = {
          ...board,
          labels: sanitizedLabels,
          cards: nextCards,
          lists: nextLists,
          updatedAt: timestamp,
        };

        if (isSavingBugCard && finalChecklist.length > 0 && finalChecklist.every((item) => item.completed)) {
          return resolveBugCard(nextBoard, selectedCard.id, timestamp);
        }

        if (
          !isSavingBugCard &&
          finalChecklist.length > 0 &&
          finalChecklist.every((item) => item.completed) &&
          !hasOpenBugForParent(nextBoard, selectedCard.id)
        ) {
          const reviewList = getReviewList(nextBoard);
          const doneList = getDoneList(nextBoard);
          if (reviewList && doneList && nextListId === reviewList.id && reviewList.id !== doneList.id) {
            nextBoard = moveCardWithinBoard(nextBoard, selectedCard.id, doneList.id, null, timestamp);
          }
        }

        return synchronizeBoardAutomation(nextBoard, timestamp);
      })
    );

    closeCard();
  };

  const handleDeleteSelectedCard = () => {
    if (!selectedBoard || !selectedCard) return;
    const timestamp = new Date().toISOString();

    setKanbanBoards((prev) =>
      prev.map((board) => {
        if (board.id !== selectedBoard.id) return board;

        let nextCards = board.cards.filter((card) => card.id !== selectedCard.id);
        if (
          selectedCard.cardKind === 'bug' &&
          selectedCard.parentCardId &&
          selectedCard.linkedBugIntentionId
        ) {
          const hasRemainingOpenBug = nextCards.some(
            (card) =>
              card.cardKind === 'bug' &&
              !card.archived &&
              card.parentCardId === selectedCard.parentCardId &&
              card.linkedBugIntentionId === selectedCard.linkedBugIntentionId
          );

          nextCards = nextCards.map((card) =>
            card.id === selectedCard.parentCardId
              ? {
                  ...card,
                  checklist: card.checklist.map((item) =>
                    item.linkedIntentionId === selectedCard.linkedBugIntentionId
                      ? {
                          ...item,
                          completed: !hasRemainingOpenBug && Boolean(selectedCard.parentIntentionWasCompleted),
                        }
                      : item
                  ),
                  updatedAt: timestamp,
                }
              : card
          );
        }

        return synchronizeBoardAutomation({
          ...board,
          cards: nextCards,
          lists: board.lists.map((list) => ({
            ...list,
            cardOrder: list.cardOrder.filter((cardId) => cardId !== selectedCard.id),
          })),
          updatedAt: timestamp,
        }, timestamp);
      })
    );

    closeCard();
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        isModal
          ? 'h-full bg-background p-4'
          : 'h-[calc(100vh-4rem)] w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 2xl:px-10'
      )}
    >
      {!isModal ? null : null}

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="inline-flex rounded-lg border border-border/60 bg-background/40 p-1">
              <button
                type="button"
                onClick={() => setBoardMode('project')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition',
                  boardMode === 'project' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Project Board
              </button>
              <button
                type="button"
                onClick={() => setBoardMode('branding')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition',
                  boardMode === 'branding' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Branding
              </button>
            </div>

            {boardMode === 'project' || boardMode === 'branding' ? (
              <div className="flex min-w-[260px] flex-1 items-center gap-2 xl:max-w-[420px]">
                <div className="flex-1">
                  <select
                    value={selectedBoardId}
                    onChange={(event) => setSelectedBoardId(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                  >
                    <option value="">Select board...</option>
                    {visibleBoards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={refreshKanbanBoards}
                  aria-label="Refresh linked project boards"
                  title="Refresh linked project boards"
                  className="h-10 w-10 shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenFeaturesResource}
                  disabled={!selectedProjectBoard}
                  className="h-10 shrink-0"
                >
                  <Library className="mr-2 h-4 w-4" />
                  Add Features
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {boardMode === 'project' || boardMode === 'branding' ? (
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search cards or linked features"
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none"
              />
            </div>
            <select
              value={selectedFeatureFilterId}
              onChange={(event) => setSelectedFeatureFilterId(event.target.value)}
              disabled={!selectedFeatureResource || featurePointOptions.length === 0}
              className="h-10 min-w-[260px] rounded-md border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">All features</option>
              {featurePointOptions.map((feature) => (
                <option key={feature.id} value={feature.id}>
                  {feature.name}
                </option>
              ))}
            </select>
            {linkedBothering ? (
              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground xl:ml-3 xl:max-w-[320px]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">Linked Bothering</div>
                <div className="mt-1 line-clamp-2 text-sm text-foreground/90">{linkedBothering}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {boardMode === 'project' || boardMode === 'branding' ? (
          selectedBoard ? (
            <>
              <div className="flex min-h-0 flex-1 overflow-x-auto pb-2">
                <div
                  className="grid min-h-full min-w-[1450px] auto-cols-fr grid-flow-col gap-3 xl:min-w-0 xl:w-full"
                  style={{ gridTemplateColumns: `repeat(${Math.max(selectedLists.length, 1)}, minmax(0, 1fr))` }}
                >
                  {selectedLists.map((list) => (
                    <BoardList
                      key={list.id}
                      list={list}
                      cards={cardsByList.get(list.id) || []}
                      labels={selectedBoard.labels}
                      getLinkedFeatureNames={getLinkedFeatureNames}
                      onOpenCard={openCard}
                      onAddCard={handleAddCard}
                      onCardDragStart={handleCardDragStart}
                      onCardDragEnd={handleCardDragEnd}
                      onCardDragOverList={handleCardDragOverList}
                      onCardDragOverCard={handleCardDragOverCard}
                      onCardDrop={handleCardDrop}
                      draggedCardId={draggedCard?.cardId || null}
                      dropTarget={dropTarget}
                      editingTitle={editingListId === list.id}
                      editingTitleValue={editingListTitle}
                      onStartTitleEdit={startListTitleEdit}
                      onTitleEditChange={setEditingListTitle}
                      onCommitTitleEdit={commitListTitleEdit}
                      onCancelTitleEdit={cancelListTitleEdit}
                      expandedChecklistCardIds={expandedChecklistCardIds}
                      onToggleChecklist={toggleChecklistExpansion}
                      onToggleChecklistItem={toggleBoardChecklistItem}
                      onScheduleBug={handleScheduleBug}
                      onOpenResource={handleOpenCardResource}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-16 text-center text-muted-foreground">
                No boards yet. Add releases in Strategy so they can be provisioned here.
              </CardContent>
            </Card>
          )
        ) : (
          <div className="flex-grow flex gap-4 overflow-x-auto pb-4">
            <TaskColumn title="Pending from Past" tasks={taskBoard.pending} isModal={isModal} onDelete={handleDeleteActivity} />
            <TaskColumn title="Scheduled for Today" tasks={taskBoard.scheduled} isModal={isModal} onDelete={handleDeleteActivity} />
            <TaskColumn title="Logged Today" tasks={taskBoard.logged} isModal={isModal} onDelete={handleDeleteActivity} />
            <TaskColumn title="Completed" tasks={taskBoard.completed} isModal={isModal} onDelete={handleDeleteActivity} />
          </div>
        )}
      </div>

      {selectedBoard && selectedCard && cardDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex h-[min(90vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="min-w-0 flex-1 space-y-3">
                <input
                  value={cardDraft.title}
                  onChange={(event) => setCardDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
                  placeholder="Card title"
                  className="w-full border-0 bg-transparent p-0 text-3xl font-bold tracking-tight text-foreground outline-none"
                />
                {boardMode !== 'branding' ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3 lg:flex-row lg:items-end">
                    <div className="min-w-[220px] lg:w-[240px]">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Stage
                      </div>
                      <select
                        value={cardDraft.listId}
                        onChange={(event) => setCardDraft((prev) => (prev ? { ...prev, listId: event.target.value } : prev))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                      >
                        {selectedLists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Linked feature
                      </div>
                      {selectedFeatureResource ? (
                        <select
                          value={cardDraft.linkedFeaturePointId}
                          onChange={(event) =>
                            setCardDraft((prev) => (prev ? { ...prev, linkedFeaturePointId: event.target.value } : prev))
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                        >
                          <option value="">No linked feature</option>
                          {featurePointOptions.map((feature) => (
                            <option key={feature.id} value={feature.id}>
                              {feature.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                          No feature resource card found for this board yet.
                        </div>
                      )}
                    </div>
                    <div className="min-w-[220px] lg:w-[240px]">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Due date
                      </div>
                      <input
                        type="date"
                        value={cardDraft.dueDate}
                        onChange={(event) => setCardDraft((prev) => (prev ? { ...prev, dueDate: event.target.value } : prev))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                      />
                    </div>
                    {!selectedFeatureResource ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button type="button" variant="outline" className="h-10" onClick={handleOpenFeaturesResource}>
                          <Library className="mr-2 h-4 w-4" />
                          Create feature card
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {boardMode === 'branding' ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={cardDraft.listId}
                      onChange={(event) => setCardDraft((prev) => (prev ? { ...prev, listId: event.target.value } : prev))}
                      className="h-9 min-w-[240px] rounded-md border border-input bg-background px-3 text-sm outline-none"
                    >
                      {selectedLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.title}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-muted-foreground">Edit card</span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeCard}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close card"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
            {isBugCard ? (
              <div className="p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <CheckSquare className="h-4 w-4 text-muted-foreground" />
                          Bug issue checklist
                        </div>
                        {selectedBugIntention ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Linked intention: {selectedBugIntention.name}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {cardDraft.checklist.filter((item) => item.completed).length}/{cardDraft.checklist.length}
                        </Badge>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={copyBugIssuesToClipboard} aria-label="Copy issues">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mb-4 flex gap-2">
                      <input
                        value={newBugIssueName}
                        onChange={(event) => setNewBugIssueName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addBugIssueDraft();
                          }
                        }}
                        placeholder="Add issue to this bug card"
                        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addBugIssueDraft}
                        disabled={!newBugIssueName.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {cardDraft.checklist.length > 0 ? (
                        cardDraft.checklist.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleChecklistItem(item.id)}
                              className="h-4 w-4"
                            />
                            <span className={cn('flex-1 text-sm', item.completed && 'text-muted-foreground line-through')}>
                              {item.text}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => removeLinkedIntention(undefined, item.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                          No issues added yet.
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Steps to reproduce
                      </div>
                      <textarea
                        value={cardDraft.description}
                        onChange={(event) => setCardDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                        placeholder="List the steps needed to reproduce this bug."
                        className="min-h-[140px] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                      <div className="mb-3 text-sm font-semibold text-foreground">Labels</div>
                      {cardDraft.labelIds.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {cardDraft.labelIds.map((labelId) => {
                            const label = cardLabelsDraft.find((entry) => entry.id === labelId);
                            if (!label) return null;
                            return (
                              <span
                                key={label.id}
                                className="inline-flex items-center rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-white"
                                style={{ backgroundColor: label.color }}
                                title={label.title}
                              >
                                {label.title}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No labels added to this card yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : isReviewCard ? (
              <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Description
                  </div>
                  <textarea
                    value={cardDraft.description}
                    onChange={(event) => setCardDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                    placeholder="Describe the work, context, or acceptance notes."
                    className="min-h-[180px] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none"
                  />

                  <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        Intention checklist
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {cardDraft.checklist.filter((item) => item.completed).length}/{cardDraft.checklist.length}
                        </Badge>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={copyIntentionsToClipboard} aria-label="Copy intentions">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {cardDraft.checklist.length > 0 ? (
                        cardDraft.checklist.map((item) => {
                          const linkedIntentionId = item.linkedIntentionId || '';
                          const linkedOpenBugCard = linkedIntentionId ? openBugCardsByIntention.get(linkedIntentionId) : null;
                          const bugHistory = linkedIntentionId ? bugHistoryByIntention.get(linkedIntentionId) || [] : [];
                          const canCreateBug = Boolean(linkedIntentionId) && !linkedIntentionId.startsWith('temp-intention-');
                          const editableIntention = editableIntentions.find((entry) => entry.id === linkedIntentionId) || null;

                          return (
                            <div key={item.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={!linkedOpenBugCard && item.completed}
                                  disabled={Boolean(linkedOpenBugCard)}
                                  onChange={() => toggleChecklistItem(item.id)}
                                  className="mt-1 h-4 w-4"
                                />
                                <div className="min-w-0 flex-1">
                                  {editingIntentionId === linkedIntentionId ? (
                                    <input
                                      value={editingIntentionName}
                                      onChange={(event) => setEditingIntentionName(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault();
                                          saveIntentionEdit();
                                        }
                                      }}
                                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
                                    />
                                  ) : (
                                    <div className={cn('text-sm font-medium', !linkedOpenBugCard && item.completed && 'text-muted-foreground line-through')}>
                                      {item.text}
                                    </div>
                                  )}
                                  {linkedOpenBugCard ? (
                                    <div className="mt-1 text-xs text-amber-500">
                                      Blocked by open bug card: {linkedOpenBugCard.title}
                                    </div>
                                  ) : null}
                                  {bugHistory.length > 0 ? (
                                    <div className="mt-2 space-y-1">
                                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Bug history
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {bugHistory.map((historyCard) => (
                                          <button
                                            key={historyCard.id}
                                            type="button"
                                            onClick={() => openBugCard(historyCard.id)}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2 py-1 text-xs text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                                            aria-label={`View ${historyCard.title}`}
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            <span>
                                              {historyCard.title} - {historyCard.checklist.length} issue{historyCard.checklist.length === 1 ? '' : 's'} - {historyCard.resolvedAt ? format(parseISO(historyCard.resolvedAt), 'MMM d') : 'Resolved'}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-start gap-1 pt-0.5">
                                  {editingIntentionId === linkedIntentionId ? (
                                    <>
                                      <Button type="button" variant="outline" size="sm" onClick={saveIntentionEdit}>
                                        Save
                                      </Button>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingIntentionId(null); setEditingIntentionName(''); }}>
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={cn('h-7 w-7', linkedOpenBugCard && 'text-amber-500')}
                                      onClick={() => (linkedOpenBugCard ? openBugCard(linkedOpenBugCard.id) : handleCreateBugCard(linkedIntentionId, item.text))}
                                      disabled={!canCreateBug}
                                      aria-label={linkedOpenBugCard ? `Open ${linkedOpenBugCard.title}` : `Add bug for ${item.text}`}
                                    >
                                      {linkedOpenBugCard ? <Eye className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => startEditingIntention(linkedIntentionId, editableIntention?.name || item.text)}
                                      aria-label={`Edit ${editableIntention?.name || item.text}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => deleteIntentionFromPopup(linkedIntentionId)}
                                      aria-label={`Delete ${editableIntention?.name || item.text}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => removeLinkedIntention(item.linkedIntentionId, item.id)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                          No intentions linked to this card yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                    <div className="mb-3 text-sm font-semibold text-foreground">Labels</div>
                    {isBreakColumnCard ? (
                      cardDraft.labelIds.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {cardDraft.labelIds.map((labelId) => {
                            const label = cardLabelsDraft.find((entry) => entry.id === labelId);
                            if (!label) return null;
                            return (
                              <span
                                key={label.id}
                                className="inline-flex items-center rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-white"
                                style={{ backgroundColor: label.color }}
                                title={label.title}
                              >
                                {label.title}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No labels added to this card yet.</div>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Default label sets
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => addDefaultLabelSet('Severity')}>
                              Add Severity
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addDefaultLabelSet('Priority')}>
                              Add Priority
                            </Button>
                          </div>
                        </div>

                        {cardDraft.labelIds.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {cardDraft.labelIds.map((labelId) => {
                              const label = cardLabelsDraft.find((entry) => entry.id === labelId);
                              if (!label) return null;
                              return (
                                <span
                                  key={label.id}
                                  className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-white"
                                  style={{ backgroundColor: label.color }}
                                  title={label.title}
                                >
                                  {label.title}
                                  <button
                                    type="button"
                                    onClick={() => toggleDraftLabel(label.id)}
                                    className="rounded-full bg-black/20 p-0.5 text-white/90 transition hover:bg-black/35 hover:text-white"
                                    aria-label={`Remove ${label.title} label`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No labels added to this card yet.</div>
                        )}

                        <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Select or create label
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <input
                                value={newLabelTitle}
                                onChange={(event) => setNewLabelTitle(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleApplyLabelInput();
                                  }
                                }}
                                placeholder="Search or create label"
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                              />
                              <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border/60 bg-background/50">
                                {filteredLabelOptions.length > 0 ? (
                                  filteredLabelOptions.map((label) => (
                                    <button
                                      key={label.id}
                                      type="button"
                                      onClick={() => toggleDraftLabel(label.id)}
                                      className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-background/70"
                                    >
                                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                                      <span className="truncate">{label.title}</span>
                                    </button>
                                  ))
                                ) : newLabelTitle.trim() ? (
                                  <button
                                    type="button"
                                    onClick={handleCreateDraftLabel}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-background/70"
                                  >
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: newLabelColor }} />
                                    <span>Create "{newLabelTitle.trim()}"</span>
                                  </button>
                                ) : (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">No available labels.</div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleApplyLabelInput}
                              disabled={!newLabelTitle.trim()}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/70 text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={exactExistingLabel ? 'Add existing label' : 'Create label'}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {LABEL_COLOR_PALETTE.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setNewLabelColor(color)}
                                className={cn(
                                  'h-7 w-7 rounded-full border-2 transition',
                                  newLabelColor === color ? 'border-white' : 'border-transparent'
                                )}
                                style={{ backgroundColor: color }}
                                aria-label={`Select ${color} label color`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                    <div className="mb-2 text-sm font-semibold text-foreground">Card snapshot</div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span>Checklist</span>
                        <span>{cardDraft.checklist.filter((item) => item.completed).length}/{cardDraft.checklist.length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Attachments</span>
                        <span>{selectedCard.attachmentIds.length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Comments</span>
                        <span>{selectedCard.commentIds.length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Labels</span>
                        <span>{cardDraft.labelIds.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Description
                  </div>
                  <textarea
                    value={cardDraft.description}
                    onChange={(event) => setCardDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                    placeholder="Describe the work, context, or acceptance notes."
                    className="min-h-[180px] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none"
                  />

                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        Intention checklist
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {cardDraft.checklist.filter((item) => item.completed).length}/{cardDraft.checklist.length}
                        </Badge>
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={copyIntentionsToClipboard} aria-label="Copy intentions">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {selectedSpecialization ? (
                      <div className="mb-2.5 space-y-2.5">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Linked micro-skills
                          </div>
                          <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-input bg-background p-2.5">
                            {availableMicroSkillGroups.map((group) => (
                              <div key={group.skillAreaId} className="space-y-1.5">
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {group.skillAreaName}
                                </div>
                                <div className="space-y-1">
                                  {group.microSkills.map((microSkill) => (
                                    <div key={microSkill.id} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={selectedIntentionMicroSkillIds.includes(microSkill.id)}
                                        onChange={() =>
                                          setSelectedIntentionMicroSkillIds((prev) =>
                                            prev.includes(microSkill.id)
                                              ? prev.filter((id) => id !== microSkill.id)
                                              : [...prev, microSkill.id]
                                          )
                                        }
                                        className="h-4 w-4"
                                      />
                                      {editingMicroSkillId === microSkill.id ? (
                                        <input
                                          value={editingMicroSkillName}
                                          onChange={(event) => setEditingMicroSkillName(event.target.value)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              event.preventDefault();
                                              saveMicroSkillEdit(group.skillAreaId, microSkill.id);
                                            }
                                          }}
                                          className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
                                        />
                                      ) : (
                                        <span className="flex-1">{microSkill.name}</span>
                                      )}
                                      {editingMicroSkillId === microSkill.id ? (
                                        <>
                                          <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => saveMicroSkillEdit(group.skillAreaId, microSkill.id)}>
                                            Save
                                          </Button>
                                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setEditingMicroSkillId(null); setEditingMicroSkillName(''); }}>
                                            Cancel
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => startEditingMicroSkill(microSkill.id, microSkill.name)}
                                            aria-label={`Edit ${microSkill.name}`}
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => deleteMicroSkillFromPopup(group.skillAreaId, microSkill.id)}
                                            aria-label={`Delete ${microSkill.name}`}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/60 p-2.5">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Add micro-skill
                          </div>
                          <div className="space-y-1.5">
                            <select
                              value={selectedSkillAreaId}
                              onChange={(event) => setSelectedSkillAreaId(event.target.value)}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                            >
                              {(selectedSpecialization?.skillAreas || []).map((area) => (
                                <option key={area.id} value={area.id}>
                                  {area.name}
                                </option>
                              ))}
                              <option value="__new__">Create new skill area</option>
                            </select>
                            {selectedSkillAreaId === '__new__' ? (
                              <input
                                value={newSkillAreaName}
                                onChange={(event) => setNewSkillAreaName(event.target.value)}
                                placeholder="New skill area name"
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                              />
                            ) : null}
                            <div className="flex gap-1.5">
                              <input
                                value={newMicroSkillName}
                                onChange={(event) => setNewMicroSkillName(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    addMicroSkillFromPopup();
                                  }
                                }}
                                placeholder="New micro-skill"
                                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={addMicroSkillFromPopup}
                                disabled={!newMicroSkillName.trim() || (!selectedSkillAreaId && !selectedSpecialization?.skillAreas?.length)}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            New intention
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              value={newIntentionName}
                              onChange={(event) => setNewIntentionName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  handleAddNewIntentionDraft();
                                }
                              }}
                              placeholder="Create a new project intention"
                              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddNewIntentionDraft}
                              disabled={!newIntentionName.trim() || selectedIntentionMicroSkillIds.length === 0}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3 rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                        This board is not linked to a specialization with editable micro-skills yet.
                      </div>
                    )}
                    <div className="space-y-2">
                      {editableIntentions.length > 0 ? (
                        editableIntentions.map((intention) => {
                          const checklistItem = cardDraft.checklist.find((item) => item.linkedIntentionId === intention.id) || null;
                          if (!checklistItem) return null;
                          return (
                            <div
                              key={checklistItem.id}
                              className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-2"
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={checklistItem.completed}
                                  onChange={() => toggleChecklistItem(checklistItem.id)}
                                  className="h-4 w-4"
                                />
                                <div className="min-w-0 flex-1">
                                  {editingIntentionId === intention.id ? (
                                    <input
                                      value={editingIntentionName}
                                      onChange={(event) => setEditingIntentionName(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault();
                                          saveIntentionEdit();
                                        }
                                      }}
                                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
                                    />
                                  ) : (
                                    <div className={cn('text-sm font-medium', checklistItem.completed && 'text-muted-foreground line-through')}>
                                      {checklistItem.text}
                                    </div>
                                  )}
                                </div>
                                {editingIntentionId === intention.id ? (
                                  <>
                                    <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={saveIntentionEdit}>
                                      Save
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setEditingIntentionId(null); setEditingIntentionName(''); }}>
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => startEditingIntention(intention.id, intention.name)}
                                      aria-label={`Edit ${intention.name}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => deleteIntentionFromPopup(intention.id)}
                                      aria-label={`Delete ${intention.name}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6.5 w-6.5 shrink-0"
                                      onClick={() => removeLinkedIntention(checklistItem.linkedIntentionId, checklistItem.id)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                          No intentions linked to this card yet.
                        </div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-2.5">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Existing intentions
                      </div>
                      {visibleIntentionOptions.length > 0 ? (
                        <div className="space-y-1.5">
                          {visibleIntentionOptions.map((intention) => (
                            <label
                              key={intention.id}
                              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border/60 px-2.5 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={() => toggleLinkedIntention(intention.id)}
                                className="mt-0.5 h-4 w-4"
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-foreground">{intention.name}</div>
                                {intention.description?.trim() ? (
                                  <div className="line-clamp-2 text-xs text-muted-foreground">{intention.description}</div>
                                ) : null}
                                {intention.kind === 'pending' ? (
                                  <div className="text-[11px] uppercase tracking-wide text-amber-500">New draft</div>
                                ) : null}
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No existing project intentions found for the selected micro-skill context.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-semibold text-foreground">Labels</div>
                    {isBreakColumnCard ? (
                      cardDraft.labelIds.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {cardDraft.labelIds.map((labelId) => {
                            const label = cardLabelsDraft.find((entry) => entry.id === labelId);
                            if (!label) return null;
                            return (
                              <span
                                key={label.id}
                                className="inline-flex items-center rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-white"
                                style={{ backgroundColor: label.color }}
                                title={label.title}
                              >
                                {label.title}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No labels added to this card yet.</div>
                      )
                    ) : (
                      <div className="space-y-2.5">
                        <div className="rounded-lg border border-border/60 bg-background/60 p-2.5">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Default label sets
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => addDefaultLabelSet('Severity')}>
                              Add Severity
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addDefaultLabelSet('Priority')}>
                              Add Priority
                            </Button>
                          </div>
                        </div>

                        {cardDraft.labelIds.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {cardDraft.labelIds.map((labelId) => {
                              const label = cardLabelsDraft.find((entry) => entry.id === labelId);
                              if (!label) return null;
                              return (
                                <span
                                  key={label.id}
                                  className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-white"
                                  style={{ backgroundColor: label.color }}
                                  title={label.title}
                                >
                                  {label.title}
                                  <button
                                    type="button"
                                    onClick={() => toggleDraftLabel(label.id)}
                                    className="rounded-full bg-black/20 p-0.5 text-white/90 transition hover:bg-black/35 hover:text-white"
                                    aria-label={`Remove ${label.title} label`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No labels added to this card yet.</div>
                        )}

                        <div className="rounded-lg border border-border/60 bg-background/60 p-2.5">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Select or create label
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <input
                                value={newLabelTitle}
                                onChange={(event) => setNewLabelTitle(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleApplyLabelInput();
                                  }
                                }}
                                placeholder="Search or create label"
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                              />
                              <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border/60 bg-background/50">
                                {filteredLabelOptions.length > 0 ? (
                                  filteredLabelOptions.map((label) => (
                                    <button
                                      key={label.id}
                                      type="button"
                                      onClick={() => toggleDraftLabel(label.id)}
                                      className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-background/70"
                                    >
                                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                                      <span className="truncate">{label.title}</span>
                                    </button>
                                  ))
                                ) : newLabelTitle.trim() ? (
                                  <button
                                    type="button"
                                    onClick={handleCreateDraftLabel}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-background/70"
                                  >
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: newLabelColor }} />
                                    <span>Create "{newLabelTitle.trim()}"</span>
                                  </button>
                                ) : (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">No available labels.</div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleApplyLabelInput}
                              disabled={!newLabelTitle.trim()}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/70 text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={exactExistingLabel ? 'Add existing label' : 'Create label'}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {LABEL_COLOR_PALETTE.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setNewLabelColor(color)}
                                className={cn(
                                  'h-7 w-7 rounded-full border-2 transition',
                                  newLabelColor === color ? 'border-white' : 'border-transparent'
                                )}
                                style={{ backgroundColor: color }}
                                aria-label={`Select ${color} label color`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {boardMode === 'branding' ? (
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">
                        {boardMode === 'branding' ? 'Linked features' : 'Linked feature'}
                      </div>
                      {selectedFeatureResource ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openGeneralPopup(selectedFeatureResource.id, null)}
                        >
                          Open feature card
                        </Button>
                      ) : null}
                    </div>
                    {selectedFeatureResource ? (
                      boardMode === 'branding' ? (
                        <div className="space-y-3">
                          <select
                            value={cardDraft.brandingType}
                            onChange={(event) =>
                              setCardDraft((prev) =>
                                prev ? { ...prev, brandingType: event.target.value === 'video' ? 'video' : 'blog' } : prev
                              )
                            }
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                          >
                            <option value="blog">Blog</option>
                            <option value="video">Video</option>
                          </select>
                          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border/60 bg-background/30 p-2.5">
                            {featurePointOptions.filter((feature) => {
                              const point = selectedFeatureResource.points.find((entry) => entry.id === feature.id);
                              return !!point?.readyForBranding;
                            }).map((feature) => (
                              <label key={feature.id} className="flex items-start gap-2 text-sm text-foreground">
                                <input
                                  type="checkbox"
                                  checked={cardDraft.linkedFeaturePointIds.includes(feature.id)}
                                  onChange={(event) =>
                                    setCardDraft((prev) => {
                                      if (!prev) return prev;
                                      const nextIds = event.target.checked
                                        ? [...prev.linkedFeaturePointIds, feature.id]
                                        : prev.linkedFeaturePointIds.filter((id) => id !== feature.id);
                                      return { ...prev, linkedFeaturePointIds: nextIds, linkedFeaturePointId: nextIds[0] || '' };
                                    })
                                  }
                                  className="mt-0.5 h-4 w-4"
                                />
                                <span>{feature.name}</span>
                              </label>
                            ))}
                            {featurePointOptions.every((feature) => {
                              const point = selectedFeatureResource.points.find((entry) => entry.id === feature.id);
                              return !point?.readyForBranding;
                            }) ? (
                              <div className="text-sm text-muted-foreground">No feature is ready for branding yet.</div>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <select
                          value={cardDraft.linkedFeaturePointId}
                          onChange={(event) =>
                            setCardDraft((prev) => (prev ? { ...prev, linkedFeaturePointId: event.target.value } : prev))
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                        >
                          <option value="">No linked feature</option>
                          {featurePointOptions.map((feature) => (
                            <option key={feature.id} value={feature.id}>
                              {feature.name}
                            </option>
                          ))}
                        </select>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          No feature resource card found for this board yet.
                        </div>
                        <Button type="button" variant="outline" onClick={handleOpenFeaturesResource}>
                          <Library className="mr-2 h-4 w-4" />
                          Create feature card
                        </Button>
                      </div>
                    )}
                  </div>
                  ) : null}

                  {boardMode === 'branding' ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Due date
                      </div>
                      <input
                        type="date"
                        value={cardDraft.dueDate}
                        onChange={(event) => setCardDraft((prev) => (prev ? { ...prev, dueDate: event.target.value } : prev))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                      />
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="mb-2 text-sm font-semibold text-foreground">Card snapshot</div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span>Checklist</span>
                        <span>{cardDraft.checklist.filter((item) => item.completed).length}/{cardDraft.checklist.length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Attachments</span>
                        <span>{selectedCard.attachmentIds.length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Comments</span>
                        <span>{selectedCard.commentIds.length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Labels</span>
                        <span>{cardDraft.labelIds.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
              <Button variant="destructive" onClick={handleDeleteSelectedCard}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Card
              </Button>
              <div className="flex items-center gap-3">
              <Button variant="outline" onClick={closeCard}>Cancel</Button>
              <Button onClick={handleSaveCard} disabled={!cardDraft.title.trim()}>Save Card</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function KanbanPage() {
  return (
    <AuthGuard>
      <KanbanPageContent />
    </AuthGuard>
  );
}
