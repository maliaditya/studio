import {
  buildTaskBciContextLines,
  type TaskBciContext,
  type TaskBciModel,
} from "@/lib/taskBci";

const normalizeText = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const joinList = (items: string[]) => items.filter(Boolean).join("; ");

const getBotheringText = (
  context: TaskBciContext,
  type: "constraint" | "mismatch" | "external"
) =>
  normalizeText(
    (context.linkedBotherings || []).find((bothering) => bothering.type === type)?.text
  );

const withFallbackList = (items: string[] | undefined, fallback: string) => {
  const cleaned = (items || []).map((item) => normalizeText(item)).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [fallback];
};

const buildTodayFocusHint = (context: TaskBciContext, bci: TaskBciModel | null) => {
  const focusCandidates = [
    ...(bci?.contents || []),
    normalizeText(context.taskDetails),
    normalizeText(context.taskDescription),
    normalizeText(context.taskName),
  ].filter(Boolean);
  const focus = focusCandidates[0] || "one concrete step in this task";
  if (context.slotName) {
    return `Use the ${context.slotName} slot to move ${focus}.`;
  }
  return `Keep today's work narrow: ${focus}.`;
};

export const buildTaskConvincerPrompt = (
  context: TaskBciContext,
  bci: TaskBciModel | null
) => {
  const constraintText = getBotheringText(context, "constraint") || "Not available in current task data.";
  const mismatchText =
    getBotheringText(context, "mismatch") ||
    getBotheringText(context, "external") ||
    "Not available in current task data.";
  const boundaryData = withFallbackList(
    bci?.boundary,
    "Unknown from current task data."
  )
    .map((item) => `- ${item}`)
    .join("\n");
  const contentsData = withFallbackList(
    bci?.contents,
    "Unknown from current task data."
  )
    .map((item) => `- ${item}`)
    .join("\n");
  const invariantData = withFallbackList(
    bci?.invariant,
    "Unknown from current task data."
  )
    .map((item) => `- ${item}`)
    .join("\n");
  const todayFocusHint = buildTodayFocusHint(context, bci);
  const contextLines = buildTaskBciContextLines(context);

  return `AI Prompt Template: Task Convincer Script
You are an AI assistant embedded inside a productivity system called DOCK.

Your job is to generate a motivational task context script that reminds the user WHY they must work on the current task.

The script must reconnect the user with:
1. The original CONSTRAINT
2. The MISMATCH in their knowledge or skill
3. The bigger purpose behind solving the mismatch
4. The BCI (Boundary, Contents, Invariant) for the task
5. The specific focus for today

The tone must be:
- calm
- rational
- motivating
- structured
- slightly philosophical
- focused on causality (why this leads to future outcomes)

The goal is NOT hype motivation.
The goal is clarity and inevitability. Help the user SEE why the task exists.

INPUT DATA

Current Task:
${normalizeText(context.taskName) || "Unknown task"}

Task Type:
${normalizeText(context.taskType) || "Unknown"}

Linked Botherings:
Constraint:
${constraintText}

Mismatch:
${mismatchText}

Boundary:
${boundaryData}

Contents:
${contentsData}

Invariant:
${invariantData}

Today's Focus Hint:
${todayFocusHint}

Additional Task Context:
${contextLines.join("\n").slice(0, 12000)}

SCRIPT STRUCTURE

Generate the output using the following sections:
1. WHY THIS TASK EXISTS
2. FEEL THE CONSTRAINT
3. VISUALIZE THE MISMATCH
4. WHY SOLVING THIS MATTERS
5. BCI VISUALIZATION
6. TODAY'S FOCUS
7. FINAL PUSH

WRITING STYLE RULES
- Use short paragraphs
- Make the user visualize things
- Use causal reasoning (if X remains unsolved -> Y consequence)
- Avoid corporate language
- Avoid cliches like "stay motivated"
- Make the user feel the logic of the task
- Return plain text only

Now generate the script using the provided task data.`;
};

export const buildTaskConvincerFallback = (
  context: TaskBciContext,
  bci: TaskBciModel | null
) => {
  const taskName = normalizeText(context.taskName) || "this task";
  const constraintText =
    getBotheringText(context, "constraint") || "a real limitation that will keep pressing until it is outgrown";
  const mismatchText =
    getBotheringText(context, "mismatch") ||
    getBotheringText(context, "external") ||
    "a gap in understanding or capability that still blocks clean action";
  const boundary = withFallbackList(
    bci?.boundary,
    `This work begins when you intentionally enter the ${taskName} context and ends when today's bounded step is closed.`
  );
  const contents = withFallbackList(
    bci?.contents,
    `The real material inside this task is the understanding, decisions, and execution needed for ${taskName}.`
  );
  const invariant = withFallbackList(
    bci?.invariant,
    `The task only matters if it remains tied to the real reason behind ${taskName}, not just surface completion.`
  );
  const biggerPurpose = [
    normalizeText(context.projectContext?.projectName),
    normalizeText(context.learningContext?.specializationName),
    normalizeText(context.projectName),
    normalizeText(context.rootTaskName),
    normalizeText(context.parentTaskName),
  ].filter(Boolean)[0];
  const todayFocus = buildTodayFocusHint(context, bci);

  return [
    "WHY THIS TASK EXISTS",
    `${taskName} is not random. It exists because there is a real constraint in your life: ${constraintText}. This task is one of the steps meant to reduce that pressure, not just fill a slot.`,
    "",
    "FEEL THE CONSTRAINT",
    `If this constraint stays untouched, it keeps shaping your options. It limits what you can do, what you can handle, or how far you can move. That is why this task deserves seriousness.`,
    "",
    "VISUALIZE THE MISMATCH",
    `The specific gap right now is this: ${mismatchText}. As long as that gap remains, the next level of work stays harder than it should be.`,
    "",
    "WHY SOLVING THIS MATTERS",
    biggerPurpose
      ? `Closing this mismatch helps you move the larger system forward: ${biggerPurpose}. That is how today's work compounds into better capability, better output, and more freedom later.`
      : `Closing this mismatch helps you outgrow the current limitation. It converts pressure into competence and turns future difficulty into something workable.`,
    "",
    "BCI VISUALIZATION",
    `Boundary: ${joinList(boundary)}`,
    `Contents: ${joinList(contents)}`,
    `Invariant: ${joinList(invariant)}`,
    "",
    "TODAY'S FOCUS",
    `${todayFocus} You do not need to solve everything today. You only need to complete today's bounded move with clarity.`,
    "",
    "FINAL PUSH",
    `Do ${taskName} because it reduces the real mismatch. When the mismatch reduces, the constraint loosens. That is the logic. Stay with the work, not the drama.`,
  ].join("\n");
};
