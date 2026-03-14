"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Share2, Library, FileText, Video, ArrowRight } from 'lucide-react';
import type { KanbanBoard, KanbanCard, KanbanList, Project, Resource } from '@/types/workout';
import { useToast } from '@/hooks/use-toast';

const BRANDING_LIST_TEMPLATES = [
  { key: 'script', title: 'Creating Script', color: '#2563eb' },
  { key: 'final', title: 'Finalizing Script', color: '#7c3aed' },
  { key: 'audio', title: 'Audio Recording', color: '#0891b2' },
  { key: 'video', title: 'Video Recording', color: '#db2777' },
  { key: 'social', title: 'Post on Social Media', color: '#ea580c' },
  { key: 'done', title: 'Done', color: '#0f766e' },
] as const;

function PersonalBrandingPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    projects,
    resources,
    resourceFolders,
    kanbanBoards,
    setKanbanBoards,
    openGeneralPopup,
  } = useAuth();

  const [draftProjectId, setDraftProjectId] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<'blog' | 'video'>('blog');
  const [draftFeatureIds, setDraftFeatureIds] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const featureFolderId = useMemo(
    () => resourceFolders.find((folder) => folder.name === 'Kanban Features' && folder.parentId === null)?.id || null,
    [resourceFolders]
  );

  const getFeatureResourceForProject = (project: Project) =>
    resources.find(
      (resource) =>
        resource.type === 'card' &&
        resource.name === `${project.name} Features` &&
        (!featureFolderId || resource.folderId === featureFolderId)
    ) || null;

  const ensureBrandingBoard = (project: Project): KanbanBoard => {
    const existingBoard = kanbanBoards.find((board) => board.boardType === 'branding' && board.projectId === project.id);
    if (existingBoard) return existingBoard;

    const projectBoard =
      kanbanBoards.find((board) => board.projectId === project.id && board.boardType !== 'branding') || null;
    const timestamp = new Date().toISOString();
    const boardId = `branding_board_${project.id}`;
    const lists: KanbanList[] = BRANDING_LIST_TEMPLATES.map((list, index) => ({
      id: `${boardId}_${list.key}`,
      boardId,
      title: list.title,
      color: list.color,
      cardOrder: [],
      position: index,
      archived: false,
    }));

    const nextBoard: KanbanBoard = {
      id: boardId,
      name: `${project.name} Branding`,
      description: `${project.name} feature branding pipeline`,
      projectId: project.id,
      releaseId: projectBoard?.releaseId || null,
      specializationId: projectBoard?.specializationId || null,
      createdAt: timestamp,
      updatedAt: timestamp,
      listOrder: lists.map((list) => list.id),
      labels: [],
      lists,
      cards: [],
      attachments: [],
      comments: [],
      boardType: 'branding',
      migratedFromReleaseWorkflow: false,
    };

    setKanbanBoards((prev) => (prev.some((board) => board.id === nextBoard.id) ? prev : [...prev, nextBoard]));
    return nextBoard;
  };

  const brandingProjects = useMemo(() => {
    return projects
      .map((project) => {
        const featureResource = getFeatureResourceForProject(project);
        const readyFeatures = (featureResource?.points || []).filter(
          (point) => point.type === 'todo' && point.text.trim() && point.readyForBranding
        );
        const brandingBoard = kanbanBoards.find((board) => board.boardType === 'branding' && board.projectId === project.id) || null;
        const brandingCards = (brandingBoard?.cards || []).filter((card) => !card.archived);

        return {
          project,
          featureResource,
          readyFeatures,
          brandingBoard,
          brandingCards,
        };
      })
      .filter((entry) => entry.readyFeatures.length > 0 || entry.brandingCards.length > 0);
  }, [kanbanBoards, projects, resources, featureFolderId]);

  const selectedDraftProject = useMemo(
    () => brandingProjects.find((entry) => entry.project.id === draftProjectId) || null,
    [brandingProjects, draftProjectId]
  );

  const handleOpenCreate = (projectId: string) => {
    const projectEntry = brandingProjects.find((entry) => entry.project.id === projectId) || null;
    setDraftProjectId(projectId);
    setDraftTitle('');
    setDraftType('blog');
    setDraftFeatureIds(projectEntry?.readyFeatures.map((feature) => feature.id) || []);
    setIsCreateOpen(true);
  };

  const handleCreateBrandingCard = () => {
    if (!selectedDraftProject) return;
    if (!draftTitle.trim()) {
      toast({ title: 'Title required', description: 'Enter a branding card title.', variant: 'destructive' });
      return;
    }
    if (draftFeatureIds.length === 0) {
      toast({ title: 'No features selected', description: 'Select at least one ready feature.', variant: 'destructive' });
      return;
    }

    const board = ensureBrandingBoard(selectedDraftProject.project);
    const firstListId = board.listOrder[0];
    const timestamp = new Date().toISOString();
    const newCardId = `branding_card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newCard: KanbanCard = {
      id: newCardId,
      boardId: board.id,
      listId: firstListId,
      cardKind: 'standard',
      title: draftTitle.trim(),
      description: '',
      labelIds: [],
      dueDate: null,
      checklist: [],
      attachmentIds: [],
      commentIds: [],
      linkedIntentionIds: [],
      linkedProjectId: selectedDraftProject.project.id,
      linkedReleaseId: board.releaseId || null,
      linkedFeatureResourceId: selectedDraftProject.featureResource?.id || null,
      linkedFeaturePointId: draftFeatureIds[0] || null,
      linkedFeaturePointIds: draftFeatureIds,
      brandingType: draftType,
      archived: false,
      position: (board.cards.filter((card) => card.listId === firstListId && !card.archived).length) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setKanbanBoards((prev) =>
      prev.map((entry) => {
        if (entry.id !== board.id) return entry;
        return {
          ...entry,
          cards: [...entry.cards, newCard],
          lists: entry.lists.map((list) =>
            list.id === firstListId ? { ...list, cardOrder: [...list.cardOrder, newCardId] } : list
          ),
          updatedAt: timestamp,
        };
      })
    );

    setIsCreateOpen(false);
    toast({ title: 'Branding card created', description: `"${draftTitle.trim()}" was added to the branding pipeline.` });
  };

  return (
    <>
      <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ready project features become branding cards. Each branding card can bundle one or more features as a blog or video demonstration.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/kanban')}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Open Kanban
          </Button>
        </div>

        {brandingProjects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No features are ready for branding yet. Complete a feature in its feature resource card, then click the branding icon on that feature.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {brandingProjects.map(({ project, featureResource, readyFeatures, brandingBoard, brandingCards }) => {
              const stageById = new Map((brandingBoard?.lists || []).map((list) => [list.id, list.title]));
              return (
                <Card key={project.id} className="border-border/60 bg-card/70">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">{project.name}</CardTitle>
                        <CardDescription>
                          {readyFeatures.length} ready feature{readyFeatures.length === 1 ? '' : 's'} • {brandingCards.length} branding card{brandingCards.length === 1 ? '' : 's'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {featureResource ? (
                          <Button variant="outline" size="sm" onClick={() => openGeneralPopup(featureResource.id, null)}>
                            <Library className="mr-2 h-4 w-4" />
                            Feature Card
                          </Button>
                        ) : null}
                        <Button size="sm" onClick={() => handleOpenCreate(project.id)} disabled={readyFeatures.length === 0}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Create Branding Card
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Ready Features</div>
                      <div className="flex flex-wrap gap-2">
                        {readyFeatures.length > 0 ? readyFeatures.map((feature) => (
                          <Badge key={feature.id} variant="secondary" className="max-w-full truncate">
                            {feature.text}
                          </Badge>
                        )) : (
                          <div className="text-sm text-muted-foreground">No ready features yet.</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Branding Cards</div>
                      <div className="space-y-3">
                        {brandingCards.length > 0 ? brandingCards.map((card) => {
                          const featureNames = (card.linkedFeaturePointIds?.length ? card.linkedFeaturePointIds : (card.linkedFeaturePointId ? [card.linkedFeaturePointId] : []))
                            .map((pointId) => featureResource?.points.find((point) => point.id === pointId)?.text?.trim() || '')
                            .filter(Boolean);
                          return (
                            <div key={card.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium text-foreground">{card.title}</div>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    <Badge variant="outline">{card.brandingType === 'video' ? 'Video' : 'Blog'}</Badge>
                                    <Badge variant="secondary">{stageById.get(card.listId) || 'Pipeline'}</Badge>
                                  </div>
                                </div>
                              </div>
                              {featureNames.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {featureNames.map((name) => (
                                    <Badge key={`${card.id}-${name}`} variant="secondary">{name}</Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        }) : (
                          <div className="rounded-xl border border-dashed border-border/60 px-3 py-8 text-center text-sm text-muted-foreground">
                            No branding cards created for this project yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Branding Card</DialogTitle>
            <DialogDescription>Bundle ready features into a blog or video branding card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <select
              value={draftProjectId}
              onChange={(event) => {
                const projectId = event.target.value;
                const entry = brandingProjects.find((item) => item.project.id === projectId) || null;
                setDraftProjectId(projectId);
                setDraftFeatureIds(entry?.readyFeatures.map((feature) => feature.id) || []);
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
            >
              <option value="">Select project</option>
              {brandingProjects.map((entry) => (
                <option key={entry.project.id} value={entry.project.id}>
                  {entry.project.name}
                </option>
              ))}
            </select>

            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Branding card title"
            />

            <select
              value={draftType}
              onChange={(event) => setDraftType(event.target.value === 'video' ? 'video' : 'blog')}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
            >
              <option value="blog">Blog</option>
              <option value="video">Video</option>
            </select>

            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">Features</div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {selectedDraftProject?.readyFeatures.length ? selectedDraftProject.readyFeatures.map((feature) => (
                  <label key={feature.id} className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draftFeatureIds.includes(feature.id)}
                      onChange={(event) =>
                        setDraftFeatureIds((prev) =>
                          event.target.checked ? [...prev, feature.id] : prev.filter((id) => id !== feature.id)
                        )
                      }
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>{feature.text}</span>
                  </label>
                )) : (
                  <div className="text-sm text-muted-foreground">No ready features for the selected project.</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBrandingCard}>
              {draftType === 'video' ? <Video className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
              Create Branding Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PersonalBrandingPage() {
  return (
    <AuthGuard>
      <PersonalBrandingPageContent />
    </AuthGuard>
  );
}
