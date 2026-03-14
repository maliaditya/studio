export interface TaskBciLinkedBothering {
  type: "external" | "mismatch" | "constraint";
  text: string;
  resolution?: string;
  mismatchType?: string;
}

export interface TaskBciLearningContext {
  specializationName?: string;
  targetDate?: string | null;
  requiredHours?: number | null;
  requiredMoney?: number | null;
  books?: string[];
  audioVideo?: string[];
  paths?: string[];
}

export interface TaskBciProjectContext {
  projectName?: string;
  targetDate?: string | null;
  requiredHours?: number | null;
  requiredMoney?: number | null;
  releaseNames?: string[];
  workflowStageSummary?: string[];
}

export interface TaskBciContext {
  taskName: string;
  taskType?: string;
  taskDetails?: string;
  taskDescription?: string;
  taskCategory?: string;
  slotName?: string;
  parentTaskName?: string;
  rootTaskName?: string;
  nodeType?: string;
  projectName?: string;
  skillDomainName?: string;
  coreSkillName?: string;
  skillAreaName?: string;
  linkedBotherings?: TaskBciLinkedBothering[];
  learningContext?: TaskBciLearningContext;
  projectContext?: TaskBciProjectContext;
  resourceNames?: string[];
}

export interface TaskBciModel {
  boundary: string[];
  contents: string[];
  invariant: string[];
}

const normalizeText = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const dedupeList = (value: unknown) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((item) =>
          normalizeText(
            typeof item === "string"
              ? item
              : (item as { text?: string; name?: string }).text ||
                  (item as { text?: string; name?: string }).name ||
                  ""
          )
        )
        .filter((entry) => entry.length >= 2)
    )
  ).slice(0, 12);

const extractJson = (raw: string) => {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw.trim();
};

export const parseTaskBciPayload = (content: string): TaskBciModel | null => {
  const jsonText = extractJson(content);
  const parsed = JSON.parse(jsonText) as {
    boundary?: unknown;
    contents?: unknown;
    invariant?: unknown;
    invariants?: unknown;
  };
  const boundary = dedupeList(parsed.boundary);
  const contents = dedupeList(parsed.contents);
  const invariant = dedupeList(parsed.invariant ?? parsed.invariants);
  if (boundary.length === 0 && contents.length === 0 && invariant.length === 0) {
    return null;
  }
  return { boundary, contents, invariant };
};

const buildSubject = (context: TaskBciContext) =>
  normalizeText(
    context.rootTaskName ||
      context.parentTaskName ||
      context.projectContext?.projectName ||
      context.projectName ||
      context.learningContext?.specializationName ||
      context.coreSkillName ||
      context.taskCategory ||
      context.taskName
  ) || "this work system";

const toLabel = (value: string) =>
  value
    .split(/[_-]/g)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

export const buildTaskBciContextLines = (context: TaskBciContext): string[] => {
  const lines = [
    `Task: ${normalizeText(context.taskName) || "Unknown task"}`,
    context.taskType ? `Task type: ${normalizeText(context.taskType)}` : "",
    context.taskDetails ? `Task details: ${normalizeText(context.taskDetails)}` : "",
    context.taskDescription ? `Task description: ${normalizeText(context.taskDescription)}` : "",
    context.taskCategory ? `Task category: ${normalizeText(context.taskCategory)}` : "",
    context.slotName ? `Slot: ${normalizeText(context.slotName)}` : "",
    context.nodeType ? `Node type: ${normalizeText(context.nodeType)}` : "",
    context.parentTaskName ? `Parent task: ${normalizeText(context.parentTaskName)}` : "",
    context.rootTaskName ? `Root task: ${normalizeText(context.rootTaskName)}` : "",
    context.projectName ? `Project: ${normalizeText(context.projectName)}` : "",
    context.skillDomainName ? `Skill domain: ${normalizeText(context.skillDomainName)}` : "",
    context.coreSkillName ? `Core skill: ${normalizeText(context.coreSkillName)}` : "",
    context.skillAreaName ? `Skill area: ${normalizeText(context.skillAreaName)}` : "",
  ].filter(Boolean);

  (context.linkedBotherings || []).forEach((bothering, index) => {
    lines.push(
      `Linked bothering ${index + 1}: [${toLabel(bothering.type)}] ${normalizeText(bothering.text) || "Untitled bothering"}`
    );
    if (bothering.mismatchType) {
      lines.push(`Linked bothering ${index + 1} mismatch type: ${toLabel(bothering.mismatchType)}`);
    }
    if (bothering.resolution) {
      lines.push(`Linked bothering ${index + 1} resolution: ${normalizeText(bothering.resolution)}`);
    }
  });

  const learning = context.learningContext;
  if (learning) {
    lines.push(`Learning specialization: ${normalizeText(learning.specializationName) || "Unknown specialization"}`);
    if (learning.targetDate) lines.push(`Learning target date: ${learning.targetDate}`);
    if (learning.requiredHours != null) lines.push(`Learning required hours: ${learning.requiredHours}`);
    if (learning.requiredMoney != null) lines.push(`Learning required money: ${learning.requiredMoney}`);
    if ((learning.books || []).length > 0) lines.push(`Books or webpages: ${learning.books!.join(", ")}`);
    if ((learning.audioVideo || []).length > 0) lines.push(`Audio or video resources: ${learning.audioVideo!.join(", ")}`);
    if ((learning.paths || []).length > 0) lines.push(`Skill paths: ${learning.paths!.join(", ")}`);
  }

  const project = context.projectContext;
  if (project) {
    lines.push(`Project context: ${normalizeText(project.projectName || context.projectName) || "Unknown project"}`);
    if (project.targetDate) lines.push(`Project target date: ${project.targetDate}`);
    if (project.requiredHours != null) lines.push(`Project required hours: ${project.requiredHours}`);
    if (project.requiredMoney != null) lines.push(`Project required money: ${project.requiredMoney}`);
    if ((project.releaseNames || []).length > 0) lines.push(`Releases: ${project.releaseNames!.join(", ")}`);
    if ((project.workflowStageSummary || []).length > 0) {
      lines.push(`Workflow stages: ${project.workflowStageSummary!.join(" | ")}`);
    }
  }

  if ((context.resourceNames || []).length > 0) {
    lines.push(`Linked resources: ${context.resourceNames!.join(", ")}`);
  }

  return lines.filter((line) => normalizeText(line).length > 0);
};

export const buildTaskBciPrompt = (context: TaskBciContext) => {
  const contextLines = buildTaskBciContextLines(context);
  return `You convert a task context into Boundary / Contents / Invariant.

Use these exact meanings:
- Boundary: defines the START and END of existence. Include create and destroy conditions.
- Contents: what exists only within the boundary. Include internal entities, responsibilities, internal interactions, and external interactions.
- Invariant: truths that never change while this thing exists. Include stable validity rules, ownership, or event/state rules only when supported by the context.

Important:
- Model the underlying system, learning unit, workflow, or mental model this task belongs to.
- Do not just restate the task as a to-do item.
- Stay grounded in the provided task, bothering, learning plan, project, and resource context.
- If some detail is missing, infer carefully from context. Do not invent specific tools or architecture not present here.
- Keep each bullet concise.
- Return strict JSON only.

Required JSON shape:
{
  "boundary": ["..."],
  "contents": ["..."],
  "invariant": ["..."]
}

Context:
${contextLines.join("\n").slice(0, 12000)}`;
};

export const buildTaskBciFallback = (context: TaskBciContext): TaskBciModel => {
  const subject = buildSubject(context);
  const botherings = (context.linkedBotherings || [])
    .map((bothering) => normalizeText(bothering.text))
    .filter(Boolean)
    .slice(0, 3);
  const contents = [
    normalizeText(context.taskDetails),
    normalizeText(context.taskDescription),
    normalizeText(context.parentTaskName),
    normalizeText(context.projectName),
    normalizeText(context.learningContext?.specializationName),
    ...botherings,
    ...(context.resourceNames || []).map((entry) => normalizeText(entry)),
  ].filter((entry) => entry.length >= 3);

  return {
    boundary: [
      `Begins when the work context for ${subject} is created with the needed inputs and focus.`,
      `Exists only while this task is moving the ${subject} workflow, learning unit, or output forward.`,
      `Ends when the current ${subject} step is completed, handed off, or intentionally closed.`,
    ],
    contents: Array.from(
      new Set([
        `${subject} responsibilities and decisions that belong to this task context.`,
        ...contents,
      ])
    ).slice(0, 8),
    invariant: [
      `This task must stay tied to the real purpose behind ${subject}, not just the surface action.`,
      `Progress is valid only when state changes through explicit work steps, checks, or learning actions.`,
      `If the parent plan or task context is dropped, this ${subject} context also loses meaning.`,
    ],
  };
};
