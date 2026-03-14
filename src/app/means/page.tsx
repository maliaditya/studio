"use client";

import React, { useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import type { CoreDomainId, MeansPillar, MeansStatus, MindsetPoint } from "@/types/workout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Blocks, BrainCircuit, Compass, Coins, HandHeart, HeartPulse, Palette, Pencil, Plus, Sparkles, Trash2, Users, Wallet, Wrench } from "lucide-react";

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
    label: "Money",
    description: "Resources required to unblock execution.",
    icon: Coins,
    categories: ["Income", "Assets", "Capital", "Investments", "Cash flow"],
  },
  method: {
    label: "Method",
    description: "Knowledge, workflow, strategy, and tools.",
    icon: Wrench,
    categories: ["Knowledge", "Algorithms", "Workflow", "Strategy", "Tools"],
  },
  ability: {
    label: "Ability",
    description: "Skill, capacity, and consistency under constraints.",
    icon: BrainCircuit,
    categories: ["Skill", "Experience", "Problem solving", "Discipline", "Cognitive ability"],
  },
};

const STATUS_META: Record<MeansStatus, { label: string; className: string }> = {
  missing: { label: "Missing", className: "bg-rose-500/10 text-rose-300 border-rose-500/30" },
  building: { label: "Building", className: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  ready: { label: "Ready", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
};

const CORE_META: Array<{
  id: CoreDomainId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "wealth", label: "Wealth", icon: Wallet },
  { id: "relations", label: "Relations", icon: Users },
  { id: "meaning", label: "Meaning", icon: Compass },
  { id: "competence", label: "Competence", icon: Wrench },
  { id: "autonomy", label: "Autonomy", icon: Blocks },
  { id: "creativity", label: "Creativity", icon: Palette },
  { id: "contribution", label: "Contribution", icon: HandHeart },
  { id: "transcendence", label: "Transcendence", icon: Sparkles },
];

const CORE_LABEL_BY_ID = CORE_META.reduce(
  (acc, item) => {
    acc[item.id] = item.label;
    return acc;
  },
  {} as Record<CoreDomainId, string>
);

const BOTHERING_SOURCES = [
  { cardId: "mindset_botherings_external", type: "External", fallbackCoreId: "health" as CoreDomainId },
  { cardId: "mindset_botherings_mismatch", type: "Mismatch", fallbackCoreId: "meaning" as CoreDomainId },
  { cardId: "mindset_botherings_constraint", type: "Constraint", fallbackCoreId: "wealth" as CoreDomainId },
] as const;

type MeansDraft = {
  botheringId: string;
  pillar: MeansPillar;
  category: string;
  status: MeansStatus;
  notes: string;
};

type BotheringRow = {
  id: string;
  cardId: string;
  type: "External" | "Mismatch" | "Constraint";
  point: MindsetPoint;
  coreId: CoreDomainId;
  taskCount: number;
};

function MeansPageContent() {
  const { mindsetCards, settings, setMindsetCards } = useAuth();
  const [selectedCoreId, setSelectedCoreId] = useState<CoreDomainId | "all">("all");
  const [selectedType, setSelectedType] = useState<"all" | "External" | "Mismatch" | "Constraint">("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState<MeansDraft>({
    botheringId: "",
    pillar: "money",
    category: PILLAR_META.money.categories[0],
    status: "missing",
    notes: "",
  });

  const mismatchPointById = useMemo(() => {
    const mismatchPoints = mindsetCards.find((card) => card.id === "mindset_botherings_mismatch")?.points || [];
    return new Map(mismatchPoints.map((point) => [point.id, point] as const));
  }, [mindsetCards]);

  const allBotherings = useMemo<BotheringRow[]>(() => {
    return BOTHERING_SOURCES.flatMap(({ cardId, type, fallbackCoreId }) => {
      const card = mindsetCards.find((item) => item.id === cardId);
      if (!card) return [];

      return (card.points || [])
        .filter((point) => !point.completed)
        .map((point) => {
          const directTasks = point.tasks || [];
          const mergedTasks = [...directTasks];

          if (type === "Constraint") {
            const seen = new Set(mergedTasks.map((task) => task.activityId || task.id || `${task.details}:${task.startDate || task.dateKey || ""}`));
            (point.linkedMismatchIds || []).forEach((mismatchId) => {
              const mismatchPoint = mismatchPointById.get(mismatchId);
              mismatchPoint?.tasks?.forEach((task) => {
                const key = task.activityId || task.id || `${task.details}:${task.startDate || task.dateKey || ""}`;
                if (seen.has(key)) return;
                seen.add(key);
                mergedTasks.push(task);
              });
            });
          }

          return {
            id: point.id,
            cardId,
            type,
            point,
            coreId: point.coreDomainId || settings.coreStateManualOverrides?.[point.id] || fallbackCoreId,
            taskCount: mergedTasks.length,
          };
        });
    });
  }, [mindsetCards, mismatchPointById, settings.coreStateManualOverrides]);

  const filteredBotherings = useMemo(() => {
    return allBotherings.filter((item) => {
      if (selectedCoreId !== "all" && item.coreId !== selectedCoreId) return false;
      if (selectedType !== "all" && item.type !== selectedType) return false;
      return true;
    });
  }, [allBotherings, selectedCoreId, selectedType]);

  const botheringOptions = filteredBotherings.length > 0 ? filteredBotherings : allBotherings;

  const selectedCoreMeta = useMemo(
    () => CORE_META.find((item) => item.id === selectedCoreId) || null,
    [selectedCoreId]
  );

  const summary = useMemo(() => {
    return (Object.keys(PILLAR_META) as MeansPillar[]).map((pillar) => {
      const ready = filteredBotherings.filter((item) => item.point.means?.[pillar]?.status === "ready").length;
      const building = filteredBotherings.filter((item) => item.point.means?.[pillar]?.status === "building").length;
      const total = filteredBotherings.length;
      return {
        pillar,
        total,
        ready,
        building,
        missing: Math.max(0, total - ready - building),
      };
    });
  }, [filteredBotherings]);

  const selectedCoreCoverage = useMemo(() => {
    if (!selectedCoreMeta) return null;

    const botherings = allBotherings.filter((item) => item.coreId === selectedCoreMeta.id);
    const totalTasks = botherings.reduce((sum, item) => sum + item.taskCount, 0);

    return {
      botherings: botherings.length,
      totalTasks,
      byPillar: (Object.keys(PILLAR_META) as MeansPillar[]).map((pillar) => {
        const ready = botherings.filter((item) => item.point.means?.[pillar]?.status === "ready").length;
        const building = botherings.filter((item) => item.point.means?.[pillar]?.status === "building").length;
        const total = botherings.length;
        return {
          pillar,
          ready,
          building,
          missing: Math.max(0, total - ready - building),
        };
      }),
    };
  }, [allBotherings, selectedCoreMeta]);

  const openCreate = (pillar: MeansPillar) => {
    const defaultBotheringId = botheringOptions[0]?.id || "";
    setDraft({
      botheringId: defaultBotheringId,
      pillar,
      category: PILLAR_META[pillar].categories[0],
      status: "missing",
      notes: "",
    });
    setIsEditorOpen(true);
  };

  const openEdit = (bothering: BotheringRow, pillar: MeansPillar) => {
    const current = bothering.point.means?.[pillar];
    setDraft({
      botheringId: bothering.id,
      pillar,
      category: current?.category || PILLAR_META[pillar].categories[0],
      status: current?.status || "missing",
      notes: current?.notes || "",
    });
    setIsEditorOpen(true);
  };

  const openCreateForBothering = (bothering: BotheringRow, pillar: MeansPillar) => {
    setDraft({
      botheringId: bothering.id,
      pillar,
      category: PILLAR_META[pillar].categories[0],
      status: "missing",
      notes: "",
    });
    setIsEditorOpen(true);
  };

  const saveEntry = () => {
    if (!draft.botheringId) return;

    setMindsetCards((prev) =>
      prev.map((card) => {
        if (!card.id.startsWith("mindset_botherings_")) return card;
        return {
          ...card,
          points: card.points.map((point) => {
            if (point.id !== draft.botheringId) return point;
            return {
              ...point,
              means: {
                ...(point.means || {}),
                [draft.pillar]: {
                  status: draft.status,
                  category: draft.category,
                  notes: draft.notes.trim(),
                },
              },
            };
          }),
        };
      })
    );

    setIsEditorOpen(false);
  };

  const deleteEntry = (botheringId: string, pillar: MeansPillar) => {
    setMindsetCards((prev) =>
      prev.map((card) => {
        if (!card.id.startsWith("mindset_botherings_")) return card;
        return {
          ...card,
          points: card.points.map((point) => {
            if (point.id !== botheringId || !point.means?.[pillar]) return point;
            const nextMeans = { ...(point.means || {}) };
            delete nextMeans[pillar];
            return {
              ...point,
              means: Object.keys(nextMeans).length > 0 ? nextMeans : undefined,
            };
          }),
        };
      })
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5 2xl:px-8">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Means</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Every bothering demands Money, Method, and Ability. This page tracks those execution prerequisites and rolls them up per core state.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <Label className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground">Core State Lens</Label>
            <select
              value={selectedCoreId}
              onChange={(event) => setSelectedCoreId(event.target.value as CoreDomainId | "all")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
            >
              <option value="all">All core states</option>
              {CORE_META.map((core) => (
                <option key={core.id} value={core.id}>
                  {core.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {summary.map(({ pillar, total, ready, building, missing }) => {
            const meta = PILLAR_META[pillar];
            const Icon = meta.icon;
            return (
              <Card key={pillar} className="border-border/60 bg-card/70">
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{meta.label}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{meta.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-2 pt-0 text-xs sm:text-sm">
                  <div>
                    <div className="text-muted-foreground">Bothers</div>
                    <div className="text-lg font-semibold sm:text-xl">{total}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Ready</div>
                    <div className="text-lg font-semibold text-emerald-400 sm:text-xl">{ready}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Building</div>
                    <div className="text-lg font-semibold text-amber-400 sm:text-xl">{building}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Missing</div>
                    <div className="text-lg font-semibold text-rose-400 sm:text-xl">{missing}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedCoreMeta && selectedCoreCoverage ? (
          <Card className="border-border/60 bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <selectedCoreMeta.icon className="h-4 w-4 text-primary" />
                {selectedCoreMeta.label}
              </CardTitle>
              <CardDescription className="text-xs">Means rollup for botherings linked to this core state.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-1 rounded-xl border border-border/60 bg-background/30 p-3">
                <div className="text-xs text-muted-foreground">Active botherings: <span className="text-foreground">{selectedCoreCoverage.botherings}</span></div>
                <div className="text-xs text-muted-foreground">Linked tasks: <span className="text-foreground">{selectedCoreCoverage.totalTasks}</span></div>
              </div>
              <div className="space-y-1 rounded-xl border border-border/60 bg-background/30 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coverage</div>
                {selectedCoreCoverage.byPillar.map((item) => (
                  <div key={item.pillar} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{PILLAR_META[item.pillar].label}</span>
                    <span className="text-foreground">{item.ready} ready • {item.building} building • {item.missing} missing</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {allBotherings.length === 0 ? (
          <Card className="border-border/60 bg-card/70">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No active botherings yet. Add botherings first, then define their Money, Method, and Ability.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 bg-card/70">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Botherings</CardTitle>
                  <CardDescription className="text-xs">Each bothering carries its own Money, Method, and Ability.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as typeof selectedType)} className="mb-3">
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="External" className="text-xs">External</TabsTrigger>
                  <TabsTrigger value="Mismatch" className="text-xs">Mismatch</TabsTrigger>
                  <TabsTrigger value="Constraint" className="text-xs">Constraint</TabsTrigger>
                </TabsList>
              </Tabs>
              {filteredBotherings.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {filteredBotherings.map((bothering) => (
                    <div key={bothering.id} className="rounded-lg border border-border/60 bg-background/35 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-sm font-semibold">{bothering.point.text}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{CORE_LABEL_BY_ID[bothering.coreId]}</Badge>
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{bothering.type}</Badge>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{bothering.taskCount} task{bothering.taskCount === 1 ? "" : "s"}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {(Object.keys(PILLAR_META) as MeansPillar[]).map((pillar) => {
                          const meta = PILLAR_META[pillar];
                          const Icon = meta.icon;
                          const entry = bothering.point.means?.[pillar];
                          const status = entry?.status || "missing";

                          return (
                            <div key={`${bothering.id}-${pillar}`} className="rounded-md border border-border/60 bg-background/40 p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Icon className="h-3.5 w-3.5 text-primary" />
                                    <div className="text-xs font-medium">{meta.label}</div>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${STATUS_META[status].className}`}>
                                      {STATUS_META[status].label}
                                    </Badge>
                                    {entry?.category ? <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{entry.category}</Badge> : null}
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(bothering, pillar)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  {entry ? (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteEntry(bothering.id, pillar)}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCreateForBothering(bothering, pillar)}>
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {entry?.notes ? (
                                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{entry.notes}</p>
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">No {meta.label.toLowerCase()} detail set yet.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  No botherings in this core state yet.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set Means</DialogTitle>
            <DialogDescription>
              Attach Money, Method, or Ability status directly to a bothering. Core state rollups update automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Bothering</Label>
              <Select value={draft.botheringId} onValueChange={(value) => setDraft((prev) => ({ ...prev, botheringId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select bothering" /></SelectTrigger>
                <SelectContent>
                  {botheringOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.point.text} • {CORE_LABEL_BY_ID[item.coreId]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label>Notes</Label>
              <Textarea
                value={draft.notes}
                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="What is missing, already working, or currently being built?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveEntry} disabled={!draft.botheringId}>Save</Button>
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
