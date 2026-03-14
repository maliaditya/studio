import type {
  MindsetChatMessage,
  MindsetPathAnswer,
  MindsetPathId,
  MindsetPathSummary,
  MindsetSession,
} from "@/types/workout";

export type AstraMindsetChoice = {
  label: string;
  value: string;
};

export type AstraMindsetPickerItem = {
  id: string;
  label: string;
  description?: string;
};

export type AstraMindsetPromptKind =
  | "link_source"
  | "select_task"
  | "select_bothering"
  | "observable_category"
  | "observable_detail"
  | "interpretation_choice"
  | "interpretation_detail"
  | "evidence_status"
  | "evidence_detail"
  | "future_projection_choice"
  | "future_projection_detail"
  | "body_state_select"
  | "body_state_other"
  | "thought_observation"
  | "body_observation"
  | "witness_detection"
  | "identity_correction"
  | "action_category"
  | "action_detail";

export type AstraMindsetPrompt = {
  id: string;
  pathId: MindsetPathId;
  kind: AstraMindsetPromptKind;
  prompt: string;
  placeholder?: string;
  choices?: AstraMindsetChoice[];
  pickerItems?: AstraMindsetPickerItem[];
  helperText?: string;
  multiSelect?: boolean;
};

export type AstraMindsetBuildInput = {
  pathId: MindsetPathId;
  username?: string | null;
  taskOptions: AstraMindsetPickerItem[];
  botheringOptions: AstraMindsetPickerItem[];
};

export type AstraMindsetPathMeta = {
  id: MindsetPathId;
  label: string;
  description: string;
};

const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const normalizeText = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const ASTRA_MINDSET_PATHS: AstraMindsetPathMeta[] = [
  {
    id: "reality_interpretation_debugger",
    label: "Reality–Interpretation Debugger",
    description: "Separate fact, mind-story, projection, body reaction, witness, and grounded action.",
  },
];

const OBSERVABLE_CATEGORY_CHOICES: AstraMindsetChoice[] = [
  { label: "Task failed", value: "task_failed" },
  { label: "Someone said/did something", value: "someone_said_or_did_something" },
  { label: "Health/body event", value: "health_or_body_event" },
  { label: "Money/work issue", value: "money_or_work_issue" },
  { label: "Relationship friction", value: "relationship_friction" },
  { label: "Other", value: "other" },
];

const INTERPRETATION_CHOICES: AstraMindsetChoice[] = [
  { label: "They think badly of me", value: "they_think_badly_of_me" },
  { label: "I failed", value: "i_failed" },
  { label: "I am not capable", value: "i_am_not_capable" },
  { label: "This always happens", value: "this_always_happens" },
  { label: "I may lose something", value: "i_may_lose_something" },
  { label: "Other", value: "other" },
];

const EVIDENCE_CHOICES: AstraMindsetChoice[] = [
  { label: "No direct evidence", value: "none" },
  { label: "Some evidence", value: "some" },
  { label: "Clear direct evidence", value: "clear" },
];

const FUTURE_PROJECTION_CHOICES: AstraMindsetChoice[] = [
  { label: "Rejection", value: "rejection" },
  { label: "Loss", value: "loss" },
  { label: "Failure", value: "failure" },
  { label: "Punishment", value: "punishment" },
  { label: "Delay / stuckness", value: "delay_or_stuckness" },
  { label: "Unknown bad future", value: "unknown_bad_future" },
  { label: "Other", value: "other" },
];

const BODY_STATE_CHOICES: AstraMindsetChoice[] = [
  { label: "Fast heartbeat", value: "fast_heartbeat" },
  { label: "Tight chest", value: "tight_chest" },
  { label: "Stomach tension", value: "stomach_tension" },
  { label: "Jaw tightness", value: "jaw_tightness" },
  { label: "Shallow breath", value: "shallow_breath" },
  { label: "Restlessness", value: "restlessness" },
  { label: "Heat", value: "heat" },
  { label: "Heaviness", value: "heaviness" },
  { label: "Other", value: "other" },
];

const OBSERVATION_CHOICES: AstraMindsetChoice[] = [
  { label: "Yes, clearly", value: "yes_clearly" },
  { label: "Partly", value: "partly" },
  { label: "No, I feel merged with them", value: "merged" },
];

const WITNESS_CHOICES: AstraMindsetChoice[] = [
  { label: "Awareness", value: "awareness" },
  { label: "Silent noticing", value: "silent_noticing" },
  { label: "Presence", value: "presence" },
  { label: "Not clear yet", value: "not_clear_yet" },
];

const IDENTITY_CHOICES: AstraMindsetChoice[] = [
  { label: "I am the awareness observing them", value: "awareness" },
  { label: "I am still mixed up with them", value: "mixed_up" },
  { label: "I can see both, but it is unstable", value: "unstable_but_visible" },
];

const ACTION_CHOICES: AstraMindsetChoice[] = [
  { label: "Fix / repair", value: "fix_or_repair" },
  { label: "Communicate", value: "communicate" },
  { label: "Study / understand", value: "study_or_understand" },
  { label: "Rest / regulate first", value: "rest_or_regulate_first" },
  { label: "Schedule next step", value: "schedule_next_step" },
  { label: "Ask for help", value: "ask_for_help" },
  { label: "Drop the drama and continue", value: "drop_drama_and_continue" },
  { label: "Other", value: "other" },
];

const getAnswer = (session: MindsetSession, stepId: string) =>
  session.answers.find((entry) => entry.stepId === stepId) || null;

const getAnswerValue = (session: MindsetSession, stepId: string) => getAnswer(session, stepId)?.value;

const getAnswerText = (session: MindsetSession, stepId: string) => {
  const value = getAnswerValue(session, stepId);
  return typeof value === "string" ? value : "";
};

const getAnswerLabel = (session: MindsetSession, stepId: string) => {
  const answer = getAnswer(session, stepId);
  if (answer?.label) return answer.label;
  if (typeof answer?.value === "string") return answer.value;
  if (Array.isArray(answer?.value)) return answer.value.join(" | ");
  return "";
};

const getPickerLabel = (prompt: AstraMindsetPrompt, value: string) =>
  prompt.pickerItems?.find((item) => item.id === value)?.label ||
  prompt.choices?.find((choice) => choice.value === value)?.label ||
  value;

const getChoiceLabel = (prompt: AstraMindsetPrompt, value: string) =>
  prompt.choices?.find((choice) => choice.value === value)?.label || value;

const buildRealityInterpretationDebuggerPrompts = (
  input: AstraMindsetBuildInput
): AstraMindsetPrompt[] => {
  const linkChoices: AstraMindsetChoice[] = [];
  if (input.botheringOptions.length > 0) {
    linkChoices.push({ label: "Link a bothering", value: "bothering" });
  }
  if (input.taskOptions.length > 0) {
    linkChoices.push({ label: "Link a task", value: "task" });
  }
  linkChoices.push({ label: "Start standalone", value: "standalone" });
  return [
  {
    id: "link:source",
    pathId: input.pathId,
    kind: "link_source",
    prompt: "Before we start, do you want to link this run to a bothering, a task, or keep it standalone?",
    choices: linkChoices,
  },
  {
    id: "link:bothering",
    pathId: input.pathId,
    kind: "select_bothering",
    prompt: "Pick the bothering you want this path to stay anchored to.",
    pickerItems: input.botheringOptions,
    placeholder: "Search botherings...",
  },
  {
    id: "link:task",
    pathId: input.pathId,
    kind: "select_task",
    prompt: "Pick the task you want this path to stay anchored to.",
    pickerItems: input.taskOptions,
    placeholder: "Search tasks...",
  },
  {
    id: "step1:observable_category",
    pathId: input.pathId,
    kind: "observable_category",
    prompt: "Step 1. What kind of event happened?",
    helperText: "Choose the closest category first. Then you will describe only the observable facts.",
    choices: OBSERVABLE_CATEGORY_CHOICES,
  },
  {
    id: "step1:observable_detail",
    pathId: input.pathId,
    kind: "observable_detail",
    prompt: "Step 1. What exactly happened? Describe only what a camera or microphone would capture.",
    placeholder: "Only the facts...",
    helperText: "No interpretation here. Example: My code crashed during the demo.",
  },
  {
    id: "step2:interpretation_choice",
    pathId: input.pathId,
    kind: "interpretation_choice",
    prompt: "Step 2. What kind of story is the mind adding?",
    helperText: "Pick the closest pattern, then write the exact story in your own words.",
    choices: INTERPRETATION_CHOICES,
  },
  {
    id: "step2:interpretation_detail",
    pathId: input.pathId,
    kind: "interpretation_detail",
    prompt: "Step 2. What story is your mind adding to the event?",
    placeholder: "The mind is saying...",
    helperText: "Example: Everyone thinks I am incompetent.",
  },
  {
    id: "step3:evidence_status",
    pathId: input.pathId,
    kind: "evidence_status",
    prompt: "Step 3. What direct evidence proves that interpretation is true?",
    choices: EVIDENCE_CHOICES,
  },
  {
    id: "step3:evidence_detail",
    pathId: input.pathId,
    kind: "evidence_detail",
    prompt: "Step 3. What exact evidence are you relying on?",
    placeholder: "Write the exact evidence only...",
  },
  {
    id: "step4:future_projection_choice",
    pathId: input.pathId,
    kind: "future_projection_choice",
    prompt: "Step 4. What future scenario are you imagining?",
    helperText: "Choose the projection type first. Then make the imagined scenario explicit.",
    choices: FUTURE_PROJECTION_CHOICES,
  },
  {
    id: "step4:future_projection_detail",
    pathId: input.pathId,
    kind: "future_projection_detail",
    prompt: "Step 4. What future scenario are you imagining exactly?",
    placeholder: "I am imagining that...",
    helperText: "Example: I may lose my job.",
  },
  {
    id: "step5:body_state",
    pathId: input.pathId,
    kind: "body_state_select",
    prompt: "Step 5. What is happening in the body right now?",
    helperText: "Select one or more sensations, then continue.",
    choices: BODY_STATE_CHOICES,
    multiSelect: true,
  },
  {
    id: "step5:body_state_other",
    pathId: input.pathId,
    kind: "body_state_other",
    prompt: "Step 5. What other body sensation is present?",
    placeholder: "Describe the body sensation...",
  },
  {
    id: "step6:thought_observation",
    pathId: input.pathId,
    kind: "thought_observation",
    prompt: "Step 6. Can you observe the thoughts appearing?",
    choices: OBSERVATION_CHOICES,
  },
  {
    id: "step7:body_observation",
    pathId: input.pathId,
    kind: "body_observation",
    prompt: "Step 7. Can you observe the body sensations?",
    choices: OBSERVATION_CHOICES,
  },
  {
    id: "step8:witness_detection",
    pathId: input.pathId,
    kind: "witness_detection",
    prompt: "Step 8. What is aware of both the thoughts and the body sensations?",
    choices: WITNESS_CHOICES,
  },
  {
    id: "step9:identity_correction",
    pathId: input.pathId,
    kind: "identity_correction",
    prompt: "Step 9. Right now, are you the changing thoughts/body, or the awareness observing them?",
    choices: IDENTITY_CHOICES,
  },
  {
    id: "step10:action_category",
    pathId: input.pathId,
    kind: "action_category",
    prompt: "Step 10. What kind of practical action exists in reality now?",
    helperText: "Pick the action type first. Then write the concrete next action.",
    choices: ACTION_CHOICES,
  },
  {
    id: "step10:action_detail",
    pathId: input.pathId,
    kind: "action_detail",
    prompt: "Step 10. What is the concrete next action?",
    placeholder: "Write one grounded action...",
    helperText: "Example: Fix bug, study the driver pipeline, or prepare the next demo.",
  },
  ];
};

export const buildAstraMindsetPrompts = (input: AstraMindsetBuildInput) => {
  if (input.pathId === "reality_interpretation_debugger") {
    return buildRealityInterpretationDebuggerPrompts(input);
  }
  return [];
};

const shouldSkipPrompt = (session: MindsetSession, prompt: AstraMindsetPrompt) => {
  const linkSource = getAnswerText(session, "link:source");
  if (prompt.kind === "select_bothering") return linkSource !== "bothering";
  if (prompt.kind === "select_task") return linkSource !== "task";
  if (prompt.kind === "evidence_detail") {
    const evidenceStatus = getAnswerText(session, "step3:evidence_status");
    return evidenceStatus !== "some" && evidenceStatus !== "clear";
  }
  if (prompt.kind === "body_state_other") {
    const bodyState = getAnswerValue(session, "step5:body_state");
    return !Array.isArray(bodyState) || !bodyState.includes("other");
  }
  return false;
};

const getActivePromptIndex = (session: MindsetSession, prompts: AstraMindsetPrompt[]) => {
  if (!prompts.length) return -1;
  let nextIndex = prompts.findIndex((prompt) => prompt.id === session.cursor.stepId);
  if (nextIndex < 0) nextIndex = 0;
  while (nextIndex < prompts.length && shouldSkipPrompt(session, prompts[nextIndex])) {
    nextIndex += 1;
  }
  return nextIndex;
};

const createCursor = (prompts: AstraMindsetPrompt[]): MindsetSession["cursor"] => ({
  stepId: prompts[0]?.id || null,
  stepIndex: 0,
  totalSteps: prompts.length,
});

const replaceAnswer = (answers: MindsetPathAnswer[], nextAnswer: MindsetPathAnswer) => {
  const existingIndex = answers.findIndex((entry) => entry.stepId === nextAnswer.stepId);
  if (existingIndex < 0) return [...answers, nextAnswer];
  return answers.map((entry, index) => (index === existingIndex ? nextAnswer : entry));
};

const splitLabels = (value: string) =>
  value
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const buildMindsetSessionSummary = (session: MindsetSession): MindsetPathSummary => {
  const evidenceLabel = getAnswerLabel(session, "step3:evidence_status");
  const evidenceNote = getAnswerText(session, "step3:evidence_detail");
  const evidenceStatus = evidenceLabel
    ? evidenceNote
      ? `${evidenceLabel}: ${evidenceNote}`
      : evidenceLabel
    : undefined;
  const bodyAnswer = getAnswer(session, "step5:body_state");
  const bodyLabels =
    typeof bodyAnswer?.label === "string" && bodyAnswer.label.trim()
      ? splitLabels(bodyAnswer.label)
      : Array.isArray(bodyAnswer?.value)
        ? bodyAnswer.value
        : [];
  const otherBodyState = getAnswerText(session, "step5:body_state_other");
  const bodyState = otherBodyState ? [...bodyLabels.filter((label) => label !== "Other"), otherBodyState] : bodyLabels;
  const evidenceKey = normalizeText(getAnswerText(session, "step3:evidence_status") || evidenceLabel);
  return {
    observableReality: getAnswerText(session, "step1:observable_detail") || getAnswerLabel(session, "step1:observable_category"),
    mindInterpretation:
      getAnswerText(session, "step2:interpretation_detail") || getAnswerLabel(session, "step2:interpretation_choice"),
    evidenceStatus,
    futureProjection:
      getAnswerText(session, "step4:future_projection_detail") || getAnswerLabel(session, "step4:future_projection_choice"),
    bodyState,
    witness: getAnswerLabel(session, "step8:witness_detection"),
    identityPosition: getAnswerLabel(session, "step9:identity_correction"),
    groundedAction: getAnswerText(session, "step10:action_detail") || getAnswerLabel(session, "step10:action_category"),
    conclusion:
      evidenceKey === "none" || evidenceKey.includes("no direct evidence")
        ? "The mind added a story beyond the facts. Reality now requires only the next action."
        : evidenceLabel
          ? "There may be some valid signal here, but the story is still larger than the facts. Act on the concrete reality only."
          : undefined,
  };
};

export const formatMindsetCompletionMessage = (session: MindsetSession) => {
  const summary = buildMindsetSessionSummary(session);
  const bodyState = summary.bodyState.length ? summary.bodyState.join(", ") : "Not captured";
  return [
    "Reality–Interpretation Debugger complete.",
    "",
    `Observable Reality: ${summary.observableReality || "Not captured"}`,
    `Mind Interpretation: ${summary.mindInterpretation || "Not captured"}`,
    `Evidence Status: ${summary.evidenceStatus || "Not captured"}`,
    `Future Projection: ${summary.futureProjection || "Not captured"}`,
    `Body State: ${bodyState}`,
    `Witness: ${summary.witness || "Not captured"}`,
    `Identity Position: ${summary.identityPosition || "Not captured"}`,
    `Grounded Action: ${summary.groundedAction || "Not captured"}`,
    "",
    `Conclusion: ${summary.conclusion || "Stay with what is directly true, and act from there."}`,
  ].join("\n");
};

export const createEmptyMindsetSession = (
  pathId: MindsetPathId,
  prompts: AstraMindsetPrompt[],
  previousMessages?: MindsetChatMessage[]
): MindsetSession => ({
  id: id(`mindset_${pathId}`),
  pathId,
  status: "in_progress",
  startedAt: Date.now(),
  completedAt: null,
  linkTarget: { type: "none" },
  cursor: createCursor(prompts),
  answers: [],
  summary: { bodyState: [] },
  messages: previousMessages || [],
});

export const syncMindsetSessionCursor = (
  session: MindsetSession,
  prompts: AstraMindsetPrompt[]
) => {
  if (!prompts.length) {
    return {
      ...session,
      cursor: {
        stepId: null,
        stepIndex: 0,
        totalSteps: 0,
      },
      summary: buildMindsetSessionSummary(session),
    };
  }
  const nextIndex = getActivePromptIndex(session, prompts);
  if (nextIndex >= prompts.length) {
    return {
      ...session,
      cursor: {
        stepId: null,
        stepIndex: prompts.length,
        totalSteps: prompts.length,
      },
      summary: buildMindsetSessionSummary(session),
    };
  }
  return {
    ...session,
    cursor: {
      stepId: prompts[nextIndex]?.id || null,
      stepIndex: Math.max(0, nextIndex),
      totalSteps: prompts.length,
    },
    summary: buildMindsetSessionSummary(session),
  };
};

export const getCurrentMindsetPrompt = (
  session: MindsetSession | null | undefined,
  prompts: AstraMindsetPrompt[]
) => {
  if (!session) return prompts[0] || null;
  const synced = syncMindsetSessionCursor(session, prompts);
  return prompts[synced.cursor.stepIndex] || null;
};

export const buildMindsetIntroMessage = (pathId: MindsetPathId, username?: string | null) => {
  if (pathId === "reality_interpretation_debugger") {
    const greeting = username ? `${username}, ` : "";
    return `${greeting}we will separate fact, interpretation, future projection, body reaction, witness, and grounded action. Use the buttons where possible. Only type when I ask for the specific event, story, or next action.`;
  }
  return "Mindset path is active.";
};

export const applyMindsetAnswerToSession = (
  session: MindsetSession,
  prompt: AstraMindsetPrompt,
  rawAnswer: string | string[],
  options?: { label?: string }
) => {
  const value = Array.isArray(rawAnswer)
    ? rawAnswer.map((entry) => String(entry || "").trim()).filter(Boolean)
    : String(rawAnswer || "").trim();
  const derivedLabel = Array.isArray(value)
    ? value.map((entry) => getChoiceLabel(prompt, entry)).join(" | ")
    : options?.label || getPickerLabel(prompt, value);
  let nextSession: MindsetSession = {
    ...session,
    answers: replaceAnswer(session.answers, {
      stepId: prompt.id,
      value,
      label: derivedLabel,
      answeredAt: Date.now(),
    }),
  };

  if (prompt.kind === "link_source") {
    nextSession = {
      ...nextSession,
      linkTarget:
        value === "task"
          ? { type: "task" }
          : value === "bothering"
            ? { type: "bothering" }
            : { type: "none" },
    };
  } else if (prompt.kind === "select_task" && typeof value === "string") {
    nextSession = {
      ...nextSession,
      linkTarget: {
        type: "task",
        id: value,
        label: options?.label || getPickerLabel(prompt, value),
      },
    };
  } else if (prompt.kind === "select_bothering" && typeof value === "string") {
    nextSession = {
      ...nextSession,
      linkTarget: {
        type: "bothering",
        id: value,
        label: options?.label || getPickerLabel(prompt, value),
      },
    };
  }

  return {
    ...nextSession,
    summary: buildMindsetSessionSummary(nextSession),
  };
};

export const advanceMindsetSession = (
  session: MindsetSession,
  prompts: AstraMindsetPrompt[]
) => {
  let nextIndex = Math.max(0, session.cursor.stepIndex) + 1;
  while (nextIndex < prompts.length && shouldSkipPrompt(session, prompts[nextIndex])) {
    nextIndex += 1;
  }

  if (nextIndex >= prompts.length) {
    const completedSession: MindsetSession = {
      ...session,
      status: "completed",
      completedAt: Date.now(),
      cursor: {
        stepId: null,
        stepIndex: prompts.length,
        totalSteps: prompts.length,
      },
    };
    return {
      ...completedSession,
      summary: buildMindsetSessionSummary(completedSession),
    };
  }

  const nextPrompt = prompts[nextIndex];
  const advancedSession: MindsetSession = {
    ...session,
    cursor: {
      stepId: nextPrompt.id,
      stepIndex: nextIndex,
      totalSteps: prompts.length,
    },
  };
  return {
    ...advancedSession,
    summary: buildMindsetSessionSummary(advancedSession),
  };
};

const messageText = (message?: MindsetChatMessage) => normalizeText(message?.content);

export const appendMindsetMessages = (
  session: MindsetSession,
  nextMessages: MindsetChatMessage[]
) => {
  const messages = [...(session.messages || [])];
  nextMessages.forEach((message) => {
    const alreadyExists = messages.some(
      (entry) =>
        entry.role === message.role &&
        entry.stepId === message.stepId &&
        messageText(entry) === messageText(message)
    );
    if (!alreadyExists) {
      messages.push(message);
    }
  });
  return { ...session, messages };
};
