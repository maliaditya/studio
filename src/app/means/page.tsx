"use client";

import React, { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { MeansEntry, MeansPillar, MeansStatus } from '@/types/workout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, BrainCircuit, Wrench, Plus, Pencil, Trash2, Link2, Layers3, Bug, Workflow, Target } from 'lucide-react';

const PILLAR_META: Record<
  MeansPillar,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    categories: string[];
  }
> = {
  money: {
    label: 'Money',
    description: 'Resources that make execution possible.',
    icon: Coins,
    categories: ['Income', 'Assets', 'Capital', 'Investments', 'Cash flow'],
  },
  method: {
    label: 'Method',
    description: 'Process, strategy, workflow, and tools.',
    icon: Wrench,
    categories: ['Knowledge', 'Algorithms', 'Workflow', 'Strategy', 'Tools'],
  },
  ability: {
    label: 'Ability',
    description: 'Capability to execute under constraints.',
    icon: BrainCircuit,
    categories: ['Skill', 'Experience', 'Problem solving', 'Discipline', 'Cognitive ability'],
  },
};

const STATUS_META: Record<MeansStatus, { label: string; className: string }> = {
  missing: { label: 'Missing', className: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  building: { label: 'Building', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  ready: { label: 'Ready', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
};

type MeansDraft = {
  id?: string;
  pillar: MeansPillar;
  category: string;
  title: string;
  status: MeansStatus;
  notes: string;
  linkedProjectIds: string[];
};

function MeansPageContent() {
  const { settings, setSettings, projects, offerizationPlans, coreSkills, deepWorkDefinitions, kanbanBoards } = useAuth();
  const entries = settings.means?.entries || [];
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState<MeansDraft>({
    pillar: 'money',
    category: PILLAR_META.money.categories[0],
    title: '',
    status: 'building',
    notes: '',
    linkedProjectIds: [],
  });

  const specializationNames = useMemo(
    () =>
      new Map(coreSkills.filter((skill) => skill.type === 'Specialization').map((skill) => [skill.id, skill.name])),
    [coreSkills]
  );

  const releaseLinksByProject = useMemo(() => {
    const next = new Map<string, Array<{ specializationId: string; specializationName: string; releaseId: string }>>();
    Object.entries(offerizationPlans || {}).forEach(([specializationId, plan]) => {
      (plan.releases || []).forEach((release) => {
        const project = projects.find((candidate) => candidate.name === release.name);
        if (!project) return;
        const existing = next.get(project.id) || [];
        existing.push({
          specializationId,
          specializationName: specializationNames.get(specializationId) || 'Unknown specialization',
          releaseId: release.id,
        });
        next.set(project.id, existing);
      });
    });
    return next;
  }, [offerizationPlans, projects, specializationNames]);

  const boardStatsByProject = useMemo(() => {
    const next = new Map<string, { cards: number; openBugs: number }>();
    kanbanBoards.forEach((board) => {
      const projectId = board.projectId || projects.find((project) => project.name === board.name)?.id;
      if (!projectId) return;
      const current = next.get(projectId) || { cards: 0, openBugs: 0 };
      current.cards += (board.cards || []).filter((card) => !card.archived).length;
      current.openBugs += (board.cards || []).filter((card) => card.cardKind === 'bug' && !card.archived).length;
      next.set(projectId, current);
    });
    return next;
  }, [kanbanBoards, projects]);

  const intentionStatsByProject = useMemo(() => {
    const next = new Map<string, { total: number; completed: number }>();
    deepWorkDefinitions.forEach((definition) => {
      const linkedIds = new Set<string>([
        ...(definition.primaryProjectId ? [definition.primaryProjectId] : []),
        ...(definition.linkedProjectIds || []),
      ]);
      linkedIds.forEach((projectId) => {
        const current = next.get(projectId) || { total: 0, completed: 0 };
        current.total += 1;
        if (definition.completed) current.completed += 1;
        next.set(projectId, current);
      });
    });
    return next;
  }, [deepWorkDefinitions]);

  const filteredEntries = useMemo(() => {
    if (selectedProjectId === 'all') return entries;
    return entries.filter((entry) => (entry.linkedProjectIds || []).includes(selectedProjectId));
  }, [entries, selectedProjectId]);

  const summary = useMemo(() => {
    return (Object.keys(PILLAR_META) as MeansPillar[]).map((pillar) => {
      const pillarEntries = filteredEntries.filter((entry) => entry.pillar === pillar);
      return {
        pillar,
        total: pillarEntries.length,
        ready: pillarEntries.filter((entry) => entry.status === 'ready').length,
        building: pillarEntries.filter((entry) => entry.status === 'building').length,
        missing: pillarEntries.filter((entry) => entry.status === 'missing').length,
      };
    });
  }, [filteredEntries]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectedProjectCoverage = useMemo(() => {
    if (!selectedProject) return null;
    const linkedEntries = entries.filter((entry) => (entry.linkedProjectIds || []).includes(selectedProject.id));
    const byPillar = (Object.keys(PILLAR_META) as MeansPillar[]).map((pillar) => ({
      pillar,
      count: linkedEntries.filter((entry) => entry.pillar === pillar).length,
      ready: linkedEntries.filter((entry) => entry.pillar === pillar && entry.status === 'ready').length,
    }));

    return {
      plannerLinks: releaseLinksByProject.get(selectedProject.id) || [],
      boardStats: boardStatsByProject.get(selectedProject.id) || { cards: 0, openBugs: 0 },
      intentions: intentionStatsByProject.get(selectedProject.id) || { total: 0, completed: 0 },
      byPillar,
      linkedEntries,
    };
  }, [selectedProject, entries, releaseLinksByProject, boardStatsByProject, intentionStatsByProject]);

  const openCreate = (pillar: MeansPillar) => {
    setDraft({
      pillar,
      category: PILLAR_META[pillar].categories[0],
      title: '',
      status: 'building',
      notes: '',
      linkedProjectIds: selectedProjectId !== 'all' ? [selectedProjectId] : [],
    });
    setIsEditorOpen(true);
  };

  const openEdit = (entry: MeansEntry) => {
    setDraft({
      id: entry.id,
      pillar: entry.pillar,
      category: entry.category,
      title: entry.title,
      status: entry.status,
      notes: entry.notes || '',
      linkedProjectIds: [...(entry.linkedProjectIds || [])],
    });
    setIsEditorOpen(true);
  };

  const saveEntry = () => {
    if (!draft.title.trim()) return;
    const nextEntry: MeansEntry = {
      id: draft.id || `means-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pillar: draft.pillar,
      category: draft.category,
      title: draft.title.trim(),
      status: draft.status,
      notes: draft.notes.trim(),
      linkedProjectIds: draft.linkedProjectIds,
    };
    setSettings((prev) => {
      const currentEntries = prev.means?.entries || [];
      const nextEntries = draft.id
        ? currentEntries.map((entry) => (entry.id === draft.id ? nextEntry : entry))
        : [...currentEntries, nextEntry];
      return {
        ...prev,
        means: {
          entries: nextEntries,
        },
      };
    });
    setIsEditorOpen(false);
  };

  const deleteEntry = (entryId: string) => {
    setSettings((prev) => ({
      ...prev,
      means: {
        entries: (prev.means?.entries || []).filter((entry) => entry.id !== entryId),
      },
    }));
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 2xl:px-10">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Means</h1>
            <p className="text-sm text-muted-foreground">
              Every task demands Money, Method, and Ability. This page tracks those execution prerequisites against your projects.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <Label className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground">Project Lens</Label>
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
            >
              <option value="all">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {summary.map(({ pillar, total, ready, building, missing }) => {
            const meta = PILLAR_META[pillar];
            const Icon = meta.icon;
            return (
              <Card key={pillar} className="border-border/60 bg-card/70">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">{meta.label}</CardTitle>
                  </div>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="text-2xl font-semibold">{total}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Ready</div>
                    <div className="text-2xl font-semibold text-emerald-400">{ready}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Building</div>
                    <div className="text-2xl font-semibold text-amber-400">{building}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Missing</div>
                    <div className="text-2xl font-semibold text-rose-400">{missing}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedProject && selectedProjectCoverage ? (
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {selectedProject.name}
              </CardTitle>
              <CardDescription>
                Coverage view for the currently selected project.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
              <div className="space-y-3 rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Planner Links</div>
                {selectedProjectCoverage.plannerLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectCoverage.plannerLinks.map((link) => (
                      <Badge key={`${link.specializationId}-${link.releaseId}`} variant="outline">
                        {link.specializationName}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No specialization project planner link.</div>
                )}
              </div>
              <div className="space-y-2 rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium"><Workflow className="h-4 w-4 text-primary" />Kanban</div>
                <div className="text-sm text-muted-foreground">Cards: <span className="text-foreground">{selectedProjectCoverage.boardStats.cards}</span></div>
                <div className="text-sm text-muted-foreground">Open bugs: <span className="text-foreground">{selectedProjectCoverage.boardStats.openBugs}</span></div>
              </div>
              <div className="space-y-2 rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium"><Layers3 className="h-4 w-4 text-primary" />Deep Work</div>
                <div className="text-sm text-muted-foreground">Intentions: <span className="text-foreground">{selectedProjectCoverage.intentions.total}</span></div>
                <div className="text-sm text-muted-foreground">Completed: <span className="text-foreground">{selectedProjectCoverage.intentions.completed}</span></div>
              </div>
              <div className="space-y-2 rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4 text-primary" />Means Coverage</div>
                {selectedProjectCoverage.byPillar.map((item) => (
                  <div key={item.pillar} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{PILLAR_META[item.pillar].label}</span>
                    <span className="text-foreground">{item.ready}/{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          {(Object.keys(PILLAR_META) as MeansPillar[]).map((pillar) => {
            const meta = PILLAR_META[pillar];
            const Icon = meta.icon;
            const pillarEntries = filteredEntries.filter((entry) => entry.pillar === pillar);

            return (
              <Card key={pillar} className="border-border/60 bg-card/70">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle>{meta.label}</CardTitle>
                    </div>
                    <Button size="sm" onClick={() => openCreate(pillar)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  <CardDescription>{meta.categories.join(' • ')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pillarEntries.length > 0 ? (
                    pillarEntries.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-border/60 bg-background/35 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">{entry.title}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge variant="outline">{entry.category}</Badge>
                              <Badge variant="outline" className={STATUS_META[entry.status].className}>
                                {STATUS_META[entry.status].label}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {entry.notes ? (
                          <p className="mt-3 text-sm text-muted-foreground">{entry.notes}</p>
                        ) : null}
                        {(entry.linkedProjectIds || []).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(entry.linkedProjectIds || [])
                              .map((projectId) => projects.find((project) => project.id === projectId)?.name)
                              .filter((name): name is string => !!name)
                              .map((name) => (
                                <Badge key={`${entry.id}-${name}`} variant="secondary">{name}</Badge>
                              ))}
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-muted-foreground">Not linked to a specific project.</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                      No {meta.label.toLowerCase()} entries yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit Means Entry' : 'Add Means Entry'}</DialogTitle>
            <DialogDescription>
              Capture the prerequisite needed to execute a project or class of tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pillar</Label>
              <Select
                value={draft.pillar}
                onValueChange={(value) => {
                  const pillar = value as MeansPillar;
                  setDraft((prev) => ({
                    ...prev,
                    pillar,
                    category: PILLAR_META[pillar].categories[0],
                  }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PILLAR_META) as MeansPillar[]).map((pillar) => (
                    <SelectItem key={pillar} value={pillar}>{PILLAR_META[pillar].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={draft.category} onValueChange={(value) => setDraft((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PILLAR_META[draft.pillar].categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Title</Label>
              <Input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="e.g. Stable monthly runway for LifeOS launch" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={draft.notes} onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))} placeholder="What exactly is missing or ready here?" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(value) => setDraft((prev) => ({ ...prev, status: value as MeansStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Linked Projects</Label>
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-border/60 p-3">
                {projects.map((project) => {
                  const checked = draft.linkedProjectIds.includes(project.id);
                  return (
                    <label key={project.id} className="flex items-start gap-2 rounded-md px-1 py-1 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            linkedProjectIds: value
                              ? [...prev.linkedProjectIds, project.id]
                              : prev.linkedProjectIds.filter((id) => id !== project.id),
                          }))
                        }
                      />
                      <span>{project.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveEntry}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MeansPage() {
  return (
    <AuthGuard>
      <MeansPageContent />
    </AuthGuard>
  );
}
