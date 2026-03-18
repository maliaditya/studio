"use client";

import React, { useMemo } from "react";
import { format, parseISO, startOfDay, differenceInDays, addDays, addMonths, isAfter, isBefore } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const normalizeText = (value?: string) => (value || "").trim().toLowerCase().replace(/\s+/g, " ");
const normalizeDateKey = (value?: string | null) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "yyyy-MM-dd");
};
const stripInstanceDateSuffix = (value?: string) => (value || "").replace(/_\d{4}-\d{2}-\d{2}$/, "");

const countRoutineOccurrences = (
  routine: { routine?: { type: "daily" | "weekly" | "custom"; days?: number; repeatInterval?: number; repeatUnit?: "day" | "week" | "month" } | null; baseDate?: string },
  endDateKey: string | null,
  fromDate: Date
) => {
  if (!routine || !endDateKey) return null;
  const endDate = startOfDay(parseISO(endDateKey));
  if (Number.isNaN(endDate.getTime())) return null;
  if (isBefore(endDate, fromDate)) return 0;

  const rule = routine.routine;
  if (!rule) return 0;

  const recurrence = rule.type;
  const interval = Math.max(1, rule.repeatInterval || rule.days || 1);
  const unit = rule.repeatUnit || (recurrence === "weekly" ? "week" : "day");
  const baseDateKey = normalizeDateKey(routine.baseDate) || format(fromDate, "yyyy-MM-dd");
  let cursor = startOfDay(parseISO(baseDateKey));
  if (Number.isNaN(cursor.getTime())) cursor = fromDate;

  if (unit === "month") {
    if (isBefore(cursor, fromDate)) {
      while (isBefore(cursor, fromDate)) cursor = addMonths(cursor, interval);
    }
    let count = 0;
    while (!isAfter(cursor, endDate)) {
      if (!isBefore(cursor, fromDate)) count += 1;
      cursor = addMonths(cursor, interval);
    }
    return count;
  }

  const stepDays = unit === "week" ? interval * 7 : interval;
  if (isBefore(cursor, fromDate)) {
    while (isBefore(cursor, fromDate)) cursor = addDays(cursor, stepDays);
  }

  let count = 0;
  while (!isAfter(cursor, endDate)) {
    if (!isBefore(cursor, fromDate)) count += 1;
    cursor = addDays(cursor, stepDays);
  }
  return count;
};

export function LearningPerformanceModal({ isOpen, onOpenChange }: Props) {
  const { settings, offerizationPlans, coreSkills, upskillDefinitions, deepWorkDefinitions, skillAcquisitionPlans } = useAuth();

  const cards = useMemo(() => {
    const today = startOfDay(new Date());
    const logs = Object.values(settings.learningPerformanceDailyLogs || {}).flat();
    const plannedSpecializationIds = new Set((skillAcquisitionPlans || []).map((plan) => plan.specializationId));
    const specializationList = (coreSkills || []).filter(
      (skill) => skill.type === "Specialization" && plannedSpecializationIds.has(skill.id)
    );

    const mapDefinitionToSpecIds = new Map<string, string[]>();
    const allDefinitions = [...(upskillDefinitions || []), ...(deepWorkDefinitions || [])];
    allDefinitions.forEach((def) => {
      const categoryKey = normalizeText(def.category);
      const specIds = specializationList
        .filter((spec) => {
          const specName = normalizeText(spec.name);
          if (specName === categoryKey) return true;
          if (spec.skillAreas.some((area) => normalizeText(area.name) === categoryKey)) return true;
          return spec.skillAreas.some((area) => area.microSkills.some((micro) => normalizeText(micro.name) === categoryKey));
        })
        .map((spec) => spec.id);
      mapDefinitionToSpecIds.set(def.id, specIds);
    });

    const routineBySpecId = new Map<string, typeof settings.routines>();
    (settings.routines || []).forEach((routine) => {
      const routineTaskIds = new Set<string>((routine.taskIds || []).map(stripInstanceDateSuffix));
      routineTaskIds.add(stripInstanceDateSuffix(routine.id));
      const detailKey = normalizeText(routine.details);

      const matchedSpecs = specializationList
        .filter((spec) => {
          if (routineTaskIds.has(spec.id)) return true;
          if (detailKey && detailKey === normalizeText(spec.name)) return true;
          for (const taskId of routineTaskIds) {
            const mapped = mapDefinitionToSpecIds.get(taskId) || [];
            if (mapped.includes(spec.id)) return true;
          }
          return false;
        })
        .map((spec) => spec.id);

      matchedSpecs.forEach((specId) => {
        const current = routineBySpecId.get(specId) || [];
        routineBySpecId.set(specId, [...current, routine]);
      });
    });

    return specializationList
      .map((spec) => {
        const plan = offerizationPlans?.[spec.id];
        const learningPlan = plan?.learningPlan;
        const releases = plan?.releases || [];
        const relevantReleases = releases.filter((release) => {
          const hasFocusAreas = (release.focusAreaIds || []).length > 0;
          const hasMeta = !!(release.name || "").trim() || !!normalizeDateKey(release.launchDate);
          const stages = release.workflowStages;
          const stageItemsCount =
            (stages?.ideaItems?.length || 0) +
            (stages?.codeItems?.length || 0) +
            (stages?.breakItems?.length || 0) +
            (stages?.fixItems?.length || 0);
          return hasFocusAreas || hasMeta || stageItemsCount > 0;
        });
        const hasLearning = !!learningPlan && (
          (learningPlan.bookWebpageResources?.length || 0) > 0 ||
          (learningPlan.audioVideoResources?.length || 0) > 0 ||
          (learningPlan.skillTreePaths?.length || 0) > 0
        );
        const hasProject = relevantReleases.length > 0;
        const hasBooksPlan = (learningPlan?.bookWebpageResources?.length || 0) > 0;
        const hasAudioPlan = (learningPlan?.audioVideoResources?.length || 0) > 0;
        const hasSkillTreePlan = (learningPlan?.skillTreePaths?.length || 0) > 0;
        if (!hasLearning && !hasProject) return null;

        const specLogs = logs.filter((entry) => entry.specializationId === spec.id);
        const pageLogs = specLogs.filter((entry) => entry.pagesCompleted > 0);
        const audioLogs = specLogs.filter((entry) => entry.hoursCompleted > 0);
        const projectItemLogs = specLogs.filter((entry) => entry.itemsCompleted > 0 && (entry.activityType === "deepwork" || entry.activityType === "planning"));
        const skillTreeItemLogs = specLogs.filter((entry) => entry.itemsCompleted > 0 && entry.activityType === "upskill");

        const pageDays = new Set(pageLogs.map((entry) => entry.dateKey)).size;
        const audioDays = new Set(audioLogs.map((entry) => entry.dateKey)).size;
        const projectDays = new Set(projectItemLogs.map((entry) => entry.dateKey)).size;
        const skillDays = new Set(skillTreeItemLogs.map((entry) => entry.dateKey)).size;

        const totalPages = pageLogs.reduce((sum, entry) => sum + entry.pagesCompleted, 0);
        const totalHours = audioLogs.reduce((sum, entry) => sum + entry.hoursCompleted, 0);
        const totalProjectItems = projectItemLogs.reduce((sum, entry) => sum + entry.itemsCompleted, 0);
        const totalSkillItems = skillTreeItemLogs.reduce((sum, entry) => sum + entry.itemsCompleted, 0);

        const bookEndDate = (learningPlan?.bookWebpageResources || [])
          .map((resource) => normalizeDateKey(resource.completionDate))
          .filter((date): date is string => !!date)
          .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);
        const audioEndDate = (learningPlan?.audioVideoResources || [])
          .map((resource) => normalizeDateKey(resource.completionDate))
          .filter((date): date is string => !!date)
          .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);
        const skillEndDate = (learningPlan?.skillTreePaths || [])
          .map((path) => normalizeDateKey(path.completionDate))
          .filter((date): date is string => !!date)
          .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);
        const projectEndDate = relevantReleases
          .map((release) => normalizeDateKey(release.launchDate))
          .filter((date): date is string => !!date)
          .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);

        const routines = routineBySpecId.get(spec.id) || [];
        const plannedBookSessions = bookEndDate ? routines.reduce((sum, routine) => sum + (countRoutineOccurrences(routine, bookEndDate, today) || 0), 0) : null;
        const plannedAudioSessions = audioEndDate ? routines.reduce((sum, routine) => sum + (countRoutineOccurrences(routine, audioEndDate, today) || 0), 0) : null;
        const plannedSkillSessions = skillEndDate ? routines.reduce((sum, routine) => sum + (countRoutineOccurrences(routine, skillEndDate, today) || 0), 0) : null;
        const plannedProjectSessions = projectEndDate ? routines.reduce((sum, routine) => sum + (countRoutineOccurrences(routine, projectEndDate, today) || 0), 0) : null;

        return {
          specId: spec.id,
          specName: spec.name,
          logsCount: specLogs.length,
          hasBooksPlan,
          hasAudioPlan,
          hasSkillTreePlan,
          hasProjectPlan: hasProject,
          readingPerSession: pageLogs.length > 0 ? Number((totalPages / pageLogs.length).toFixed(2)) : 0,
          readingPerDay: pageDays > 0 ? Number((totalPages / pageDays).toFixed(2)) : 0,
          audioPerSession: audioLogs.length > 0 ? Number((totalHours / audioLogs.length).toFixed(2)) : 0,
          audioPerDay: audioDays > 0 ? Number((totalHours / audioDays).toFixed(2)) : 0,
          projectItemsPerDay: projectDays > 0 ? Number((totalProjectItems / projectDays).toFixed(2)) : 0,
          skillItemsPerDay: skillDays > 0 ? Number((totalSkillItems / skillDays).toFixed(2)) : 0,
          plannedBookSessions,
          plannedAudioSessions,
          plannedSkillSessions,
          plannedProjectSessions,
          bookEndDate,
          audioEndDate,
          skillEndDate,
          projectEndDate,
          daysToBookEnd: bookEndDate ? Math.max(0, differenceInDays(startOfDay(parseISO(bookEndDate)), today)) : null,
          daysToAudioEnd: audioEndDate ? Math.max(0, differenceInDays(startOfDay(parseISO(audioEndDate)), today)) : null,
          daysToSkillEnd: skillEndDate ? Math.max(0, differenceInDays(startOfDay(parseISO(skillEndDate)), today)) : null,
          daysToProjectEnd: projectEndDate ? Math.max(0, differenceInDays(startOfDay(parseISO(projectEndDate)), today)) : null,
        };
      })
      .filter((card): card is NonNullable<typeof card> => !!card);
  }, [settings.learningPerformanceDailyLogs, offerizationPlans, coreSkills, upskillDefinitions, deepWorkDefinitions, settings.routines, skillAcquisitionPlans]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[86vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle>Learning & Project Speed Analytics</DialogTitle>
          <DialogDescription>
            Daily logs + routine-frequency based session planning until each plan end date.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {cards.length === 0 ? (
              <Card className="border-white/10 bg-background/40">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No linked learning/project plans found yet.
                </CardContent>
              </Card>
            ) : (
              cards.map((card) => (
                <Card key={card.specId} className="border-white/10 bg-background/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{card.specName}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">
                        Logs: {card.logsCount}
                      </span>
                      {card.hasBooksPlan && <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">Reading</span>}
                      {card.hasAudioPlan && <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">Audio</span>}
                      {card.hasSkillTreePlan && <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">Skill Tree</span>}
                      {card.hasProjectPlan && <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">Project</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {card.hasBooksPlan && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Reading speed</span>
                          <span className="font-medium">{card.readingPerSession} pages/session</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{card.readingPerDay} pages/day</span>
                          <span>Ends {card.bookEndDate || "N/A"}{card.daysToBookEnd != null ? ` • ${card.daysToBookEnd} days` : ""}</span>
                        </div>
                      </div>
                    )}
                    {card.hasAudioPlan && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Audio speed</span>
                          <span className="font-medium">{card.audioPerSession} hrs/session</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{card.audioPerDay} hrs/day</span>
                          <span>Ends {card.audioEndDate || "N/A"}{card.daysToAudioEnd != null ? ` • ${card.daysToAudioEnd} days` : ""}</span>
                        </div>
                      </div>
                    )}
                    {card.hasSkillTreePlan && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Skill-tree speed</span>
                          <span className="font-medium">{card.skillItemsPerDay} items/day</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Sessions till end: {card.plannedSkillSessions ?? "N/A"}</span>
                          <span>Ends {card.skillEndDate || "N/A"}{card.daysToSkillEnd != null ? ` • ${card.daysToSkillEnd} days` : ""}</span>
                        </div>
                      </div>
                    )}
                    {card.hasProjectPlan && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Project speed</span>
                          <span className="font-medium">{card.projectItemsPerDay} items/day</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Sessions till end: {card.plannedProjectSessions ?? "N/A"}</span>
                          <span>Ends {card.projectEndDate || "N/A"}{card.daysToProjectEnd != null ? ` • ${card.daysToProjectEnd} days` : ""}</span>
                        </div>
                      </div>
                    )}
                    {(card.hasBooksPlan || card.hasAudioPlan || card.hasSkillTreePlan || card.hasProjectPlan) && (
                      <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground">
                        Tip: Focus on the plan with the shortest end date to avoid bottlenecks.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
