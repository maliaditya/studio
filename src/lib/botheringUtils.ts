import type { MindsetPoint } from "@/types/workout";

type BotheringTask = NonNullable<MindsetPoint["tasks"]>[number];

const taskKey = (task: BotheringTask) =>
  task.activityId || task.id || `${task.details}:${task.startDate || task.dateKey || ""}`;

export const getConstraintLinkTargetType = (
  point?: MindsetPoint
): "mismatch" | "external" =>
  point?.constraintType === "self-imposed" ? "external" : "mismatch";

export const getConstraintLinkedIds = (point?: MindsetPoint): string[] =>
  getConstraintLinkTargetType(point) === "external"
    ? point?.linkedExternalIds || []
    : point?.linkedMismatchIds || [];

export const getEffectiveConstraintTasks = (
  point: MindsetPoint,
  mismatchPointById: Map<string, MindsetPoint>,
  externalPointById: Map<string, MindsetPoint>
): BotheringTask[] => {
  const merged: BotheringTask[] = [...(point.tasks || [])];
  const seen = new Set<string>();
  merged.forEach((task) => {
    seen.add(taskKey(task));
  });

  const targetMap =
    getConstraintLinkTargetType(point) === "external"
      ? externalPointById
      : mismatchPointById;

  getConstraintLinkedIds(point).forEach((linkedId) => {
    const linkedPoint = targetMap.get(linkedId);
    if (!linkedPoint?.tasks?.length) return;
    linkedPoint.tasks.forEach((task) => {
      const key = taskKey(task);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(task);
    });
  });

  return merged;
};
